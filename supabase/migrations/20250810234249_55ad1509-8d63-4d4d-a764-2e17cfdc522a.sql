-- إضافة دور الإدارة العامة للنظام
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

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

-- إنشاء مستخدم المدير العام
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- البحث عن المستخدم الحالي أو إنشاء واحد جديد
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'system.admin@agency-platform.com';
    
    IF admin_user_id IS NULL THEN
        -- إدراج المستخدم في جدول auth.users
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            'system.admin@agency-platform.com',
            '$2a$10$rRQW7JnqWvY4oR5Q7vZXJ.mPXJjmVK1kZ6fN8K2hQpG5xZ3YhJnrS', -- كلمة مرور: SystemAdmin123!
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "مدير النظام العام"}',
            false,
            '',
            '',
            '',
            ''
        ) RETURNING id INTO admin_user_id;
    END IF;
    
    -- إضافة دور المدير العام
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
END $$;

-- إدراج خطط الاشتراك الافتراضية
INSERT INTO public.subscription_plans (name, description, price, billing_interval, features, max_users, max_orders, max_storage_gb, is_popular, sort_order, created_by) VALUES
('الباقة الأساسية', 'مناسبة للوكالات الصغيرة والناشئة', 299, 'monthly', 
'["إدارة العملاء", "إدارة المشاريع الأساسية", "الفواتير", "التقارير الأساسية", "دعم فني عبر البريد"]'::jsonb, 
5, 100, 5, false, 1, (SELECT id FROM auth.users WHERE email = 'system.admin@agency-platform.com')),

('الباقة المتوسطة', 'مناسبة للوكالات المتوسطة', 599, 'monthly',
'["جميع مميزات الباقة الأساسية", "إدارة المشاريع المتقدمة", "تقارير مفصلة", "WhatsApp Integration", "دعم فني عبر الهاتف", "تخزين إضافي"]'::jsonb,
15, 500, 20, true, 2, (SELECT id FROM auth.users WHERE email = 'system.admin@agency-platform.com')),

('الباقة المتقدمة', 'مناسبة للوكالات الكبيرة والمؤسسات', 999, 'monthly',
'["جميع مميزات الباقة المتوسطة", "عدد غير محدود من المستخدمين", "عدد غير محدود من المشاريع", "تقارير متقدمة", "API Access", "دعم فني مخصص 24/7", "تخزين غير محدود"]'::jsonb,
null, null, null, false, 3, (SELECT id FROM auth.users WHERE email = 'system.admin@agency-platform.com'))

ON CONFLICT DO NOTHING;

-- إدراج الإعدادات العامة للنظام
INSERT INTO public.system_settings (setting_key, setting_value, created_by) VALUES
('system_info', '{
  "name": "منصة إدارة الوكالات الإعلانية",
  "version": "1.0.0",
  "description": "نظام شامل لإدارة الوكالات الإعلانية والتسويقية",
  "logo_url": "/system-logo.png",
  "support_email": "support@agency-platform.com",
  "support_phone": "+966501234567"
}'::jsonb, (SELECT id FROM auth.users WHERE email = 'system.admin@agency-platform.com')),

('platform_settings', '{
  "allow_registration": true,
  "require_email_verification": true,
  "trial_period_days": 14,
  "max_agencies_per_user": 3,
  "default_agency_plan": "basic",
  "maintenance_mode": false
}'::jsonb, (SELECT id FROM auth.users WHERE email = 'system.admin@agency-platform.com')),

('notification_settings', '{
  "email_notifications": true,
  "sms_notifications": false,
  "push_notifications": true,
  "admin_notifications": {
    "new_agency_registration": true,
    "payment_failures": true,
    "subscription_cancellations": true
  }
}'::jsonb, (SELECT id FROM auth.users WHERE email = 'system.admin@agency-platform.com'))

ON CONFLICT (setting_key) DO NOTHING;