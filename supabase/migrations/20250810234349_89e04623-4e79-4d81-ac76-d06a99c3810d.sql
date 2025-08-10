-- إنشاء جدول إعدادات النظام العامة
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- إنشاء جدول خطط الاشتراك
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'SAR',
    billing_interval TEXT NOT NULL DEFAULT 'monthly', -- monthly, yearly
    features JSONB DEFAULT '[]'::jsonb,
    max_users INTEGER,
    max_orders INTEGER,
    max_storage_gb INTEGER,
    is_active BOOLEAN DEFAULT true,
    is_popular BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- تمكين RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للإعدادات العامة - فقط المدير العام
CREATE POLICY "Super admins can manage system settings" ON public.system_settings
    FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- سياسات الأمان لخطط الاشتراك
CREATE POLICY "Super admins can manage subscription plans" ON public.subscription_plans
    FOR ALL USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Everyone can view active subscription plans" ON public.subscription_plans
    FOR SELECT USING (is_active = true);