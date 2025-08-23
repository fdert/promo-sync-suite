-- Disable duplicate WhatsApp sends on order creation by restricting DB triggers to UPDATE only
-- 1) Drop any existing order notification triggers that fire on INSERT
DO $$
BEGIN
  -- Drop known trigger names if they exist
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'order_notification_trigger' AND tgrelid = 'public.orders'::regclass) THEN
    DROP TRIGGER order_notification_trigger ON public.orders;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'advanced_order_notification_trigger' AND tgrelid = 'public.orders'::regclass) THEN
    DROP TRIGGER advanced_order_notification_trigger ON public.orders;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'simple_order_notification_trigger' AND tgrelid = 'public.orders'::regclass) THEN
    DROP TRIGGER simple_order_notification_trigger ON public.orders;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_order_status_change' AND tgrelid = 'public.orders'::regclass) THEN
    DROP TRIGGER trigger_order_status_change ON public.orders;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'order_status_change_trigger' AND tgrelid = 'public.orders'::regclass) THEN
    DROP TRIGGER order_status_change_trigger ON public.orders;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'notify_order_status_change' AND tgrelid = 'public.orders'::regclass) THEN
    DROP TRIGGER notify_order_status_change ON public.orders;
  END IF;

  -- Additionally, drop any triggers on orders that call send_order_notification or advanced_order_notification, regardless of name
  PERFORM 1 FROM pg_proc WHERE proname = 'send_order_notification' AND pronamespace = 'public'::regnamespace;
  IF FOUND THEN
    FOR r IN (
      SELECT tgname FROM pg_trigger t
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE t.tgrelid = 'public.orders'::regclass AND p.proname = 'send_order_notification'
    ) LOOP
      EXECUTE format('DROP TRIGGER %I ON public.orders', r.tgname);
    END LOOP;
  END IF;

  PERFORM 1 FROM pg_proc WHERE proname = 'advanced_order_notification' AND pronamespace = 'public'::regnamespace;
  IF FOUND THEN
    FOR r IN (
      SELECT tgname FROM pg_trigger t
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE t.tgrelid = 'public.orders'::regclass AND p.proname = 'advanced_order_notification'
    ) LOOP
      EXECUTE format('DROP TRIGGER %I ON public.orders', r.tgname);
    END LOOP;
  END IF;
END $$;

-- 2) Create a single, clear trigger that only fires on UPDATE (status changes etc.)
CREATE TRIGGER order_status_update_whatsapp_trigger
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.advanced_order_notification();

-- 3) Ensure a unique index on whatsapp_messages.dedupe_key to prevent duplicates from any path
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'uniq_whatsapp_messages_dedupe_key'
      AND n.nspname = 'public'
  ) THEN
    CREATE UNIQUE INDEX uniq_whatsapp_messages_dedupe_key
    ON public.whatsapp_messages (dedupe_key)
    WHERE dedupe_key IS NOT NULL;
  END IF;
END $$;