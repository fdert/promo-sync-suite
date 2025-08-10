-- إضافة دور السوبر أدمن إلى enum الأدوار
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- إنشاء حساب السوبر أدمن
INSERT INTO public.user_roles (
  user_id,
  role
) VALUES (
  '336f6e48-78c8-4bd3-975d-ad3e3f41afdd',
  'super_admin'
) ON CONFLICT (user_id, role) DO NOTHING;

-- إنشاء جدول إعدادات النظام العام
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- تفعيل RLS على جدول إعدادات النظام
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للسوبر أدمن فقط
CREATE POLICY "السوبر أدمن يمكنه إدارة إعدادات النظام"
ON public.system_settings
FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() 
  AND role = 'super_admin'
));

-- إدراج إعدادات النظام الأساسية
INSERT INTO public.system_settings (setting_key, setting_value, description, created_by) VALUES 
('system_info', '{
  "name": "نظام إدارة وكالات الدعاية والإعلان",
  "version": "1.0.0",
  "description": "نظام شامل لإدارة الوكالات الإعلانية والتسويقية",
  "support_email": "support@agency-system.com",
  "website": "https://agency-system.com"
}', 'معلومات النظام الأساسية', '336f6e48-78c8-4bd3-975d-ad3e3f41afdd'),

('subscription_plans', '{
  "basic": {
    "name": "الباقة الأساسية",
    "price": 299,
    "currency": "SAR",
    "duration": "monthly",
    "features": [
      "إدارة 100 عميل",
      "5 مستخدمين",
      "10 جيجا تخزين",
      "دعم فني أساسي"
    ],
    "max_users": 5,
    "max_customers": 100,
    "max_storage_gb": 10
  },
  "pro": {
    "name": "الباقة المتقدمة", 
    "price": 599,
    "currency": "SAR",
    "duration": "monthly",
    "features": [
      "إدارة 500 عميل",
      "15 مستخدم",
      "50 جيجا تخزين",
      "دعم فني متقدم",
      "تقارير متقدمة"
    ],
    "max_users": 15,
    "max_customers": 500,
    "max_storage_gb": 50
  },
  "enterprise": {
    "name": "باقة المؤسسات",
    "price": 1199,
    "currency": "SAR", 
    "duration": "monthly",
    "features": [
      "عدد عملاء غير محدود",
      "عدد مستخدمين غير محدود",
      "تخزين غير محدود",
      "دعم فني مخصص",
      "تخصيص النظام"
    ],
    "max_users": -1,
    "max_customers": -1,
    "max_storage_gb": -1
  }
}', 'خطط الاشتراك المتاحة', '336f6e48-78c8-4bd3-975d-ad3e3f41afdd'),

('global_settings', '{
  "maintenance_mode": false,
  "allow_new_registrations": true,
  "default_subscription_plan": "basic",
  "trial_duration_days": 14,
  "max_agencies_per_user": 3,
  "email_notifications": true,
  "sms_notifications": false
}', 'الإعدادات العامة للنظام', '336f6e48-78c8-4bd3-975d-ad3e3f41afdd')

ON CONFLICT (setting_key) DO NOTHING;