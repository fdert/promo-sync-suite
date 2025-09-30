-- إنشاء جدول إعدادات المتابعة
CREATE TABLE IF NOT EXISTS public.follow_up_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number text NOT NULL,
  email text,
  notify_new_order boolean DEFAULT true,
  notify_delivery_delay boolean DEFAULT true,
  notify_payment_delay boolean DEFAULT true,
  notify_whatsapp_failure boolean DEFAULT true,
  notify_expense_logged boolean DEFAULT true,
  daily_financial_report boolean DEFAULT true,
  delivery_delay_days integer DEFAULT 1,
  payment_delay_days integer DEFAULT 7,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.follow_up_settings ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول
CREATE POLICY "Authenticated users can view follow up settings"
ON public.follow_up_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage follow up settings"
ON public.follow_up_settings
FOR ALL
TO authenticated
USING (true);

-- إنشاء trigger للتحديث التلقائي
CREATE TRIGGER update_follow_up_settings_updated_at
BEFORE UPDATE ON public.follow_up_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- إدراج إعدادات افتراضية
INSERT INTO public.follow_up_settings (whatsapp_number, email, delivery_delay_days, payment_delay_days)
VALUES ('966500000000', 'admin@example.com', 1, 7)
ON CONFLICT DO NOTHING;