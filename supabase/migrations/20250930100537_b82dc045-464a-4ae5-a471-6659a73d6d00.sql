-- إضافة الأعمدة المفقودة لجدول webhook_settings
ALTER TABLE public.webhook_settings 
ADD COLUMN IF NOT EXISTS webhook_name text,
ADD COLUMN IF NOT EXISTS secret_key text,
ADD COLUMN IF NOT EXISTS order_statuses text[],
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- جعل webhook_name إلزامي بعد إضافته
ALTER TABLE public.webhook_settings 
ALTER COLUMN webhook_name SET DEFAULT 'ويب هوك جديد';

-- تحديث السجلات الموجودة بقيم افتراضية إذا كانت فارغة
UPDATE public.webhook_settings 
SET webhook_name = COALESCE(webhook_name, 'ويب هوك ' || webhook_type)
WHERE webhook_name IS NULL;