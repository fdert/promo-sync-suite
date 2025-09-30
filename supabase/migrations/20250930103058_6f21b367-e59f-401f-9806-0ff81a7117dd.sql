-- Add dedupe_key used by send-order-notifications for duplicate prevention
ALTER TABLE public.whatsapp_messages
ADD COLUMN IF NOT EXISTS dedupe_key text;

-- Helpful index for quick dedupe lookups within time window
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_dedupe_key_created_at
ON public.whatsapp_messages (dedupe_key, created_at DESC);
