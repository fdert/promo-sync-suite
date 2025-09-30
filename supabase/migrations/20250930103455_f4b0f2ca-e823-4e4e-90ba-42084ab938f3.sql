-- Ensure dedupe works with ON CONFLICT in send-order-notifications
ALTER TABLE public.whatsapp_messages
ADD CONSTRAINT whatsapp_messages_dedupe_key_unique UNIQUE (dedupe_key);
