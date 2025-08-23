-- Add dedupe_key column and a unique partial index to prevent duplicate WhatsApp messages per event
ALTER TABLE public.whatsapp_messages
ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

-- Unique index only when dedupe_key is set
CREATE UNIQUE INDEX IF NOT EXISTS uniq_whatsapp_dedupe_key
ON public.whatsapp_messages (dedupe_key)
WHERE dedupe_key IS NOT NULL;