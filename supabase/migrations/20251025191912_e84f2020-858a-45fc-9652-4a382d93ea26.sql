-- إصلاح دالة إرسال رسالة التقييم عند اكتمال الطلب
CREATE OR REPLACE FUNCTION public.send_evaluation_on_order_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  eval_token TEXT;
  eval_id UUID;
  customer_phone TEXT;
  customer_whatsapp TEXT;
  normalized_phone TEXT;
  v_dedupe TEXT;
  evaluation_url TEXT;
BEGIN
  IF NEW.status = 'مكتمل' AND (OLD.status IS DISTINCT FROM 'مكتمل') THEN

    IF NEW.customer_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- جلب رقم الواتساب أو الهاتف
    SELECT phone, whatsapp INTO customer_phone, customer_whatsapp
    FROM public.customers
    WHERE id = NEW.customer_id;

    -- استخدام الواتساب أولاً ثم الهاتف
    normalized_phone := COALESCE(customer_whatsapp, customer_phone);

    -- توحيد تنسيق الرقم: إزالة المسافات والأقواس والشرطات
    normalized_phone := REGEXP_REPLACE(normalized_phone, '[^0-9+]', '', 'g');

    IF COALESCE(normalized_phone, '') = '' THEN
      RETURN NEW;
    END IF;

    -- إنشاء token باستخدام md5
    eval_token := md5(NEW.id::text || clock_timestamp()::text || random()::text);

    -- رابط التقييم الصحيح (Supabase Edge Function)
    evaluation_url := 'https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/evaluation/' || eval_token;

    -- إدراج أو تحديث التقييم
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

    v_dedupe := 'evaluation:' || NEW.id::text;

    -- إدراج رسالة واتساب
    INSERT INTO public.whatsapp_messages (
      to_number,
      message_type,
      message_content,
      customer_id,
      status,
      is_reply,
      dedupe_key
    )
    VALUES (
      normalized_phone,
      'text',
      '🌟 عزيزنا العميل، شكراً لثقتك بنا!' || E'\n\n' ||
      '✅ تم اكتمال طلبك رقم: ' || NEW.order_number || E'\n\n' ||
      '📝 نرجو تقييم تجربتك معنا من خلال الرابط التالي:' || E'\n' ||
      evaluation_url || E'\n\n' ||
      '⭐ رأيك يهمنا لتحسين خدماتنا',
      NEW.customer_id,
      'pending',
      false,
      v_dedupe
    )
    ON CONFLICT (dedupe_key) DO NOTHING;

    -- تحديث حقل sent_at في جدول التقييمات
    UPDATE public.evaluations
    SET sent_at = NOW()
    WHERE id = eval_id;

    -- محاولة تشغيل معالج رسائل الواتساب
    BEGIN
      PERFORM net.http_post(
        url := 'https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/process-whatsapp-queue',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object('source', 'send_evaluation_on_order_complete', 'order_id', NEW.id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to trigger whatsapp queue: %', SQLERRM;
    END;

  END IF;

  RETURN NEW;
END;
$function$;

-- إعادة إرسال رسالة التقييم للطلب ORD-20251023-00167
-- حذف الرسائل القديمة أولاً
DELETE FROM public.whatsapp_messages 
WHERE dedupe_key = 'evaluation:9e98f84a-238c-402a-ab61-b7eb34dc563d';

-- تحديث حالة الطلب لإعادة تشغيل الترجر
UPDATE public.orders 
SET status = 'مكتمل', updated_at = NOW()
WHERE id = '9e98f84a-238c-402a-ab61-b7eb34dc563d';