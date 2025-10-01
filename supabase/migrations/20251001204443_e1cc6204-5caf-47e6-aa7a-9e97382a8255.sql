-- إضافة حقل رابط ويب هوك إدارة المتابعة في جدول follow_up_settings
ALTER TABLE public.follow_up_settings 
ADD COLUMN IF NOT EXISTS follow_up_webhook_url TEXT;

COMMENT ON COLUMN public.follow_up_settings.follow_up_webhook_url IS 'رابط ويب هوك n8n الخاص بإرسال رسائل إدارة المتابعة';