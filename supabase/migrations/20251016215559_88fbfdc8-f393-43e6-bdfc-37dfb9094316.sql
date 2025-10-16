-- دالة لحساب وإضافة نقاط الولاء تلقائياً بعد الدفع
CREATE OR REPLACE FUNCTION public.process_loyalty_points_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loyalty_settings RECORD;
  v_points_earned INTEGER;
  v_customer_loyalty RECORD;
  v_new_balance INTEGER;
  v_customer_phone TEXT;
BEGIN
  -- التحقق من وجود customer_id
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- جلب إعدادات الولاء
  SELECT * INTO v_loyalty_settings
  FROM public.loyalty_settings
  WHERE is_active = true
  LIMIT 1;

  -- إذا لم يكن نظام الولاء مفعلاً، لا نفعل شيء
  IF NOT FOUND OR v_loyalty_settings.is_active = false THEN
    RETURN NEW;
  END IF;

  -- حساب النقاط المكتسبة
  v_points_earned := FLOOR(NEW.amount * v_loyalty_settings.points_per_currency);

  -- إذا لم يكن هناك نقاط، لا نفعل شيء
  IF v_points_earned <= 0 THEN
    RETURN NEW;
  END IF;

  -- التحقق من وجود سجل نقاط للعميل أو إنشاؤه
  SELECT * INTO v_customer_loyalty
  FROM public.customer_loyalty_points
  WHERE customer_id = NEW.customer_id;

  IF NOT FOUND THEN
    -- إنشاء سجل جديد
    INSERT INTO public.customer_loyalty_points (
      customer_id,
      total_points,
      lifetime_points,
      redeemed_points
    )
    VALUES (
      NEW.customer_id,
      v_points_earned,
      v_points_earned,
      0
    )
    RETURNING * INTO v_customer_loyalty;
    
    v_new_balance := v_points_earned;
  ELSE
    -- تحديث السجل الموجود
    UPDATE public.customer_loyalty_points
    SET 
      total_points = total_points + v_points_earned,
      lifetime_points = lifetime_points + v_points_earned,
      updated_at = NOW()
    WHERE customer_id = NEW.customer_id
    RETURNING * INTO v_customer_loyalty;
    
    v_new_balance := v_customer_loyalty.total_points;
  END IF;

  -- تسجيل المعاملة
  INSERT INTO public.loyalty_transactions (
    customer_id,
    transaction_type,
    points,
    balance_after,
    reference_type,
    reference_id,
    description,
    created_by
  )
  VALUES (
    NEW.customer_id,
    'earn',
    v_points_earned,
    v_new_balance,
    'payment',
    NEW.id,
    'نقاط مكتسبة من دفعة بمبلغ ' || NEW.amount || ' ريال',
    NEW.created_by
  );

  -- جلب رقم الواتساب للعميل
  SELECT whatsapp INTO v_customer_phone
  FROM public.customers
  WHERE id = NEW.customer_id;

  -- إذا كان هناك رقم واتساب، نرسل إشعار
  IF v_customer_phone IS NOT NULL AND v_customer_phone != '' THEN
    -- استدعاء edge function لإرسال رسالة واتساب
    PERFORM net.http_post(
      url := 'https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/send-direct-whatsapp',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('request.headers')::json->>'authorization'
      ),
      body := jsonb_build_object(
        'phoneNumber', v_customer_phone,
        'message', '🎉 تهانينا! لقد حصلت على ' || v_points_earned || ' نقطة ولاء' || E'\n' ||
                   '💰 رصيدك الحالي: ' || v_new_balance || ' نقطة' || E'\n' ||
                   'شكراً لثقتكم بنا!'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- إنشاء trigger على جدول payments
DROP TRIGGER IF EXISTS trigger_process_loyalty_points ON public.payments;

CREATE TRIGGER trigger_process_loyalty_points
AFTER INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.process_loyalty_points_on_payment();

-- إضافة تعليق على الدالة
COMMENT ON FUNCTION public.process_loyalty_points_on_payment() IS 'تقوم بحساب وإضافة نقاط الولاء تلقائياً بعد كل دفعة وإرسال إشعار واتساب للعميل';