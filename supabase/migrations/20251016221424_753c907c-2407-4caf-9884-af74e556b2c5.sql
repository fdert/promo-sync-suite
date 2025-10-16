-- تحديث دالة نقاط الولاء لإرسال رسالة تهنئة عند الوصول إلى 100 نقطة
CREATE OR REPLACE FUNCTION public.process_loyalty_points_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loyalty_settings RECORD;
  v_points_earned INTEGER := 0;
  v_customer_loyalty RECORD;
  v_new_balance INTEGER := 0;
  v_old_balance INTEGER := 0;
  v_customer_phone TEXT;
  v_customer_id uuid;
  v_min_redeem_points INTEGER := 100;
BEGIN
  -- تحديد العميل: إن لم يأتِ من الدفعة نأخذه من الطلب
  v_customer_id := NEW.customer_id;
  IF v_customer_id IS NULL AND NEW.order_id IS NOT NULL THEN
    SELECT customer_id INTO v_customer_id FROM public.orders WHERE id = NEW.order_id;
  END IF;

  -- إذا لم نتمكن من تحديد العميل، لا نفعل شيئًا
  IF v_customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- جلب إعدادات الولاء الفعّالة
  SELECT * INTO v_loyalty_settings
  FROM public.loyalty_settings
  WHERE is_active = true
  LIMIT 1;

  IF NOT FOUND OR v_loyalty_settings.is_active = false THEN
    RETURN NEW;
  END IF;

  -- حفظ الحد الأدنى للاستبدال
  v_min_redeem_points := COALESCE(v_loyalty_settings.min_points_to_redeem, 100);

  -- حساب النقاط المكتسبة: points_per_currency (عدد النقاط لكل 1 من العملة)
  v_points_earned := FLOOR(COALESCE(NEW.amount, 0) * COALESCE(v_loyalty_settings.points_per_currency, 0));
  IF v_points_earned <= 0 THEN
    RETURN NEW;
  END IF;

  -- تحديث/إنشاء رصيد نقاط العميل
  SELECT * INTO v_customer_loyalty
  FROM public.customer_loyalty_points
  WHERE customer_id = v_customer_id;

  IF NOT FOUND THEN
    v_old_balance := 0;
    INSERT INTO public.customer_loyalty_points (
      customer_id, total_points, lifetime_points, redeemed_points
    ) VALUES (
      v_customer_id, v_points_earned, v_points_earned, 0
    ) RETURNING * INTO v_customer_loyalty;

    v_new_balance := v_points_earned;
  ELSE
    v_old_balance := v_customer_loyalty.total_points;
    UPDATE public.customer_loyalty_points
    SET 
      total_points = total_points + v_points_earned,
      lifetime_points = lifetime_points + v_points_earned,
      updated_at = NOW()
    WHERE customer_id = v_customer_id
    RETURNING * INTO v_customer_loyalty;

    v_new_balance := v_customer_loyalty.total_points;
  END IF;

  -- تسجيل معاملة الولاء
  INSERT INTO public.loyalty_transactions (
    customer_id, transaction_type, points, balance_after,
    reference_type, reference_id, description, created_by
  ) VALUES (
    v_customer_id, 'earn', v_points_earned, v_new_balance,
    'payment', NEW.id, 'نقاط مكتسبة من دفعة بمبلغ ' || NEW.amount || ' ريال', NEW.created_by
  );

  -- تجهيز رسالة واتساب بإدراجها في جدول الرسائل (سيتم إرسالها من معالج الرسائل)
  SELECT whatsapp INTO v_customer_phone FROM public.customers WHERE id = v_customer_id;
  IF COALESCE(v_customer_phone, '') <> '' THEN
    BEGIN
      INSERT INTO public.whatsapp_messages (
        to_number, message_type, message_content, customer_id, status, is_reply
      ) VALUES (
        v_customer_phone,
        'text',
        '🎉 تهانينا! حصلت على ' || v_points_earned || ' نقطة ولاء\n' ||
        '💰 رصيدك الحالي: ' || v_new_balance || ' نقطة\n' ||
        'شكراً لثقتكم بنا!',
        v_customer_id,
        'pending',
        false
      );
    EXCEPTION WHEN OTHERS THEN
      -- لا نُفشل عملية الدفعة بسبب فشل إشعار الواتساب
      RAISE NOTICE 'WhatsApp enqueue failed: %', SQLERRM;
    END;

    -- إرسال رسالة تهنئة إضافية عند الوصول إلى الحد الأدنى للاستبدال لأول مرة
    IF v_old_balance < v_min_redeem_points AND v_new_balance >= v_min_redeem_points THEN
      BEGIN
        INSERT INTO public.whatsapp_messages (
          to_number, message_type, message_content, customer_id, status, is_reply
        ) VALUES (
          v_customer_phone,
          'text',
          '🎊 مبروك! 🎊\n\n' ||
          '✨ لقد وصل رصيدك من نقاط الولاء إلى ' || v_new_balance || ' نقطة!\n\n' ||
          '🎁 يمكنك الآن استبدال نقاطك واستفد من المكافآت المتاحة\n\n' ||
          '💎 شكراً لولائكم الدائم لنا!',
          v_customer_id,
          'pending',
          false
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Milestone WhatsApp enqueue failed: %', SQLERRM;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.process_loyalty_points_on_payment() IS 'تحسب نقاط الولاء تلقائياً بعد كل دفعة، وترسل رسالة واتساب بالرصيد، ورسالة تهنئة عند الوصول إلى 100 نقطة';