-- إنشاء جدول إعدادات المتابعة
CREATE TABLE IF NOT EXISTS public.follow_up_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follow_up_whatsapp TEXT,
  follow_up_email TEXT,
  send_whatsapp_on_new_order BOOLEAN DEFAULT true,
  send_whatsapp_on_delivery_delay BOOLEAN DEFAULT true,
  send_whatsapp_on_payment_delay BOOLEAN DEFAULT true,
  send_whatsapp_on_failure BOOLEAN DEFAULT true,
  delivery_delay_days INTEGER DEFAULT 7,
  payment_delay_days INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- تمكين RLS
ALTER TABLE public.follow_up_settings ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان
CREATE POLICY "المدراء يمكنهم إدارة إعدادات المتابعة" 
ON public.follow_up_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- إدراج إعدادات افتراضية
INSERT INTO public.follow_up_settings (
  send_whatsapp_on_new_order,
  send_whatsapp_on_delivery_delay,
  send_whatsapp_on_payment_delay,
  send_whatsapp_on_failure,
  delivery_delay_days,
  payment_delay_days
) VALUES (
  true,
  true,
  true,
  true,
  7,
  30
) ON CONFLICT DO NOTHING;