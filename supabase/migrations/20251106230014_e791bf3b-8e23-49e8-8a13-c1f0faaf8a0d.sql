-- تحديث دالة إرسال التقييم التلقائي لاستخدام الرابط الصحيح
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
  existing_eval_id UUID;
  existing_eval_token TEXT;
BEGIN
  -- التحقق من تغيير الحالة إلى "مكتمل"
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

    -- التحقق من وجود evaluation موجود مسبقاً
    SELECT id, evaluation_token INTO existing_eval_id, existing_eval_token
    FROM public.evaluations
    WHERE order_id = NEW.id
    LIMIT 1;

    IF existing_eval_id IS NOT NULL THEN
      -- استخدام الـ evaluation الموجود
      eval_id := existing_eval_id;
      eval_token := existing_eval_token;
      
      -- تحديث sent_at فقط
      UPDATE public.evaluations
      SET sent_at = NOW()
      WHERE id = eval_id;
      
      RAISE NOTICE 'استخدام evaluation موجود: %', eval_id;
    ELSE
      -- إنشاء token جديد باستخدام md5
      eval_token := md5(NEW.id::text || clock_timestamp()::text || random()::text);

      -- إدراج evaluation جديد
      INSERT INTO public.evaluations (
        customer_id,
        order_id,
        evaluation_token,
        sent_at,
        created_at
      )
      VALUES (
        NEW.customer_id,
        NEW.id,
        eval_token,
        NOW(),
        NOW()
      )
      RETURNING id INTO eval_id;
      
      RAISE NOTICE 'إنشاء evaluation جديد: %', eval_id;
    END IF;

    -- بناء رابط التقييم الصحيح (استخدام domain الحالي)
    evaluation_url := 'https://id-preview--e5a7747a-0935-46df-9ea9-1308e76636dc.lovable.app/evaluation/' || eval_token;

    v_dedupe := 'evaluation:' || NEW.id::text || ':' || extract(epoch from NOW())::bigint;

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
      'رمز التقييم: ' || UPPER(SUBSTRING(eval_token, LENGTH(eval_token) - 4, 5)) || E'\n\n' ||
      '⭐ رأيك يهمنا لتحسين خدماتنا',
      NEW.customer_id,
      'pending',
      false,
      v_dedupe
    )
    ON CONFLICT (dedupe_key) DO NOTHING;

    RAISE NOTICE 'تم إدراج رسالة التقييم للطلب: %', NEW.order_number;

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