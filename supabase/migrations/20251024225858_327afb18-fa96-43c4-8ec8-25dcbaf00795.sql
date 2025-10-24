-- Update trigger function to fallback to phone if WhatsApp is missing
CREATE OR REPLACE FUNCTION public.send_evaluation_on_order_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  eval_token TEXT;
  eval_id UUID;
  customer_phone TEXT;
  order_num TEXT;
BEGIN
  -- التحقق من أن الحالة الجديدة هي "مكتمل" والحالة القديمة ليست "مكتمل"
  IF NEW.status = 'مكتمل' AND (OLD.status IS NULL OR OLD.status != 'مكتمل') THEN

    -- التحقق من وجود عميل
    IF NEW.customer_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- جلب رقم العميل: تفضيل الواتساب ثم الهاتف عند عدم توفره
    SELECT COALESCE(whatsapp, phone) INTO customer_phone
    FROM public.customers
    WHERE id = NEW.customer_id;

    -- إذا لم يكن هناك رقم، لا نفعل شيء
    IF customer_phone IS NULL OR customer_phone = '' THEN
      RETURN NEW;
    END IF;

    -- توليد token للتقييم
    eval_token := generate_evaluation_token();

    -- إنشاء أو تحديث سجل التقييم
    INSERT INTO public.evaluations (
      customer_id,
      order_id,
      evaluation_token,
      created_at
    )
    VALUES (
      NEW.customer_id,
      NEW.id,
      eval_token,
      NOW()
    )
    ON CONFLICT (order_id) 
    DO UPDATE SET
      evaluation_token = EXCLUDED.evaluation_token,
      sent_at = NULL
    RETURNING id INTO eval_id;

    -- إرسال رسالة واتساب/هاتف مع رابط التقييم
    INSERT INTO public.whatsapp_messages (
      to_number,
      message_type,
      message_content,
      customer_id,
      status,
      is_reply
    )
    VALUES (
      customer_phone,
      'text',
      '🌟 عزيزنا العميل، شكراً لثقتك بنا!' || E'\n\n' ||
      '✅ تم اكتمال طلبك رقم: ' || NEW.order_number || E'\n\n' ||
      '📝 نرجو تقييم تجربتك معنا من خلال الرابط التالي:' || E'\n' ||
      'https://pqrzkfpowjutylegdcxj.supabase.co/evaluation/' || eval_token || E'\n\n' ||
      '⭐ رأيك يهمنا لتحسين خدماتنا',
      NEW.customer_id,
      'pending',
      false
    );

    -- تحديث وقت الإرسال
    UPDATE public.evaluations
    SET sent_at = NOW()
    WHERE id = eval_id;

  END IF;

  RETURN NEW;
END;
$function$;