-- Ensure evaluation messages send immediately by triggering the WhatsApp queue after insertion
CREATE OR REPLACE FUNCTION public.send_evaluation_on_order_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  eval_token TEXT;
  eval_id UUID;
  customer_phone TEXT;
  v_dedupe TEXT;
BEGIN
  IF NEW.status = 'مكتمل' AND (OLD.status IS DISTINCT FROM 'مكتمل') THEN

    IF NEW.customer_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(whatsapp, phone) INTO customer_phone
    FROM public.customers
    WHERE id = NEW.customer_id;

    IF COALESCE(customer_phone, '') = '' THEN
      RETURN NEW;
    END IF;

    -- token using md5 (no pgcrypto dependency)
    eval_token := md5(NEW.id::text || clock_timestamp()::text || random()::text);

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
      customer_phone,
      'text',
      '🌟 عزيزنا العميل، شكراً لثقتك بنا!' || E'\n\n' ||
      '✅ تم اكتمال طلبك رقم: ' || NEW.order_number || E'\n\n' ||
      '📝 نرجو تقييم تجربتك معنا من خلال الرابط التالي:' || E'\n' ||
      'https://pqrzkfpowjutylegdcxj.supabase.co/evaluation/' || eval_token || E'\n\n' ||
      '⭐ رأيك يهمنا لتحسين خدماتنا',
      NEW.customer_id,
      'pending',
      false,
      v_dedupe
    )
    ON CONFLICT (dedupe_key) DO NOTHING;

    UPDATE public.evaluations
    SET sent_at = NOW()
    WHERE id = eval_id;

    -- trigger WhatsApp queue processor to send immediately (best-effort)
    BEGIN
      PERFORM net.http_post(
        url := 'https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/process-whatsapp-queue',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object('source', 'send_evaluation_on_order_complete', 'order_id', NEW.id)
      );
    EXCEPTION WHEN OTHERS THEN
      -- do not block order update if webhook call fails
      RAISE NOTICE 'Failed to trigger whatsapp queue: %', SQLERRM;
    END;

  END IF;

  RETURN NEW;
END;
$$;