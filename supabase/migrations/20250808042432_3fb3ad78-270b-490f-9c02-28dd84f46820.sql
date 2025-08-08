-- إنشاء جدول لحفظ سجلات الـ webhooks
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    webhook_type TEXT NOT NULL,
    campaign_id UUID REFERENCES bulk_campaigns(id),
    webhook_url TEXT,
    trigger_type TEXT DEFAULT 'campaign_completed',
    status TEXT DEFAULT 'sent',
    response_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول لإعدادات الـ webhooks
CREATE TABLE IF NOT EXISTS public.webhook_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    webhook_type TEXT NOT NULL UNIQUE,
    webhook_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    trigger_events TEXT[] DEFAULT ARRAY['campaign_completed'],
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- تمكين RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_settings ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للـ webhook_logs
CREATE POLICY "المدراء والموظفون يمكنهم رؤية سجلات الـ webhooks" 
ON public.webhook_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "النظام يمكنه إضافة سجلات الـ webhooks" 
ON public.webhook_logs 
FOR INSERT 
WITH CHECK (true);

-- سياسات الأمان للـ webhook_settings
CREATE POLICY "المدراء يمكنهم إدارة إعدادات الـ webhooks" 
ON public.webhook_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- إدخال الإعدادات الافتراضية للرسائل الجماعية
INSERT INTO public.webhook_settings (webhook_type, webhook_url, description, trigger_events, is_active)
VALUES (
    'bulk_campaign',
    '',
    'webhook للرسائل الجماعية - يرسل إشعارات عند اكتمال الحملات',
    ARRAY['campaign_completed', 'campaign_started', 'campaign_failed'],
    false
) ON CONFLICT (webhook_type) DO NOTHING;