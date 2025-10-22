-- إضافة إعدادات جديدة لجدول follow_up_settings
ALTER TABLE public.follow_up_settings
ADD COLUMN IF NOT EXISTS notify_payment_logged boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_expense_logged boolean DEFAULT true;

-- إضافة تعليق على الأعمدة الجديدة
COMMENT ON COLUMN public.follow_up_settings.notify_payment_logged IS 'إشعار عند تسجيل دفعة جديدة';
COMMENT ON COLUMN public.follow_up_settings.notify_expense_logged IS 'إشعار عند تسجيل مصروف جديد';