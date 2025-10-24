-- Ensure pgcrypto is available for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Replace trigger function to add dedupe handling and avoid failures
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
  v_dedupe TEXT;
BEGIN
  -- Fire only when moving to 'مكتمل'
  IF NEW.status = 'مكتمل' AND (OLD.status IS DISTINCT FROM 'مكتمل') THEN

    -- Must have a customer
    IF NEW.customer_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Prefer WhatsApp, fallback to phone
    SELECT COALESCE(whatsapp, phone) INTO customer_phone
    FROM public.customers
    WHERE id = NEW.customer_id;

    IF COALESCE(customer_phone, '') = '' THEN
      RETURN NEW;
    END IF;

    -- Generate token
    eval_token := encode(gen_random_bytes(16), 'hex');

    -- Upsert evaluation record for this order
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

    -- Build dedupe key to avoid duplicate WhatsApp messages
    v_dedupe := 'evaluation:' || NEW.id::text;

    -- Queue WhatsApp message (de-duplicated)
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

    -- Mark evaluation as sent
    UPDATE public.evaluations
    SET sent_at = NOW()
    WHERE id = eval_id;

  END IF;

  RETURN NEW;
END;
$function$;

-- Create the trigger if it doesn't exist already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_send_eval_on_complete'
  ) THEN
    CREATE TRIGGER trg_send_eval_on_complete
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.send_evaluation_on_order_complete();
  END IF;
END $$;