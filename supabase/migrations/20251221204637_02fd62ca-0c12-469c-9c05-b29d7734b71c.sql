-- إضافة عمود عداد المحاولات لجدول رسائل الواتساب
ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- إضافة تعليق للعمود
COMMENT ON COLUMN public.whatsapp_messages.retry_count IS 'عدد محاولات إعادة الإرسال (الحد الأقصى 3)';