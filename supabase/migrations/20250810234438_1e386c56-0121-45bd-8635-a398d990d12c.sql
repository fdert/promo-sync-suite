-- إدراج خطط الاشتراك الافتراضية
INSERT INTO public.subscription_plans (name, description, price, billing_interval, features, max_users, max_orders, max_storage_gb, is_popular, sort_order) VALUES
('الباقة الأساسية', 'مناسبة للوكالات الصغيرة والناشئة', 299, 'monthly', 
'["إدارة العملاء", "إدارة المشاريع الأساسية", "الفواتير", "التقارير الأساسية", "دعم فني عبر البريد"]'::jsonb, 
5, 100, 5, false, 1),

('الباقة المتوسطة', 'مناسبة للوكالات المتوسطة', 599, 'monthly',
'["جميع مميزات الباقة الأساسية", "إدارة المشاريع المتقدمة", "تقارير مفصلة", "WhatsApp Integration", "دعم فني عبر الهاتف", "تخزين إضافي"]'::jsonb,
15, 500, 20, true, 2),

('الباقة المتقدمة', 'مناسبة للوكالات الكبيرة والمؤسسات', 999, 'monthly',
'["جميع مميزات الباقة المتوسطة", "عدد غير محدود من المستخدمين", "عدد غير محدود من المشاريع", "تقارير متقدمة", "API Access", "دعم فني مخصص 24/7", "تخزين غير محدود"]'::jsonb,
null, null, null, false, 3)

ON CONFLICT DO NOTHING;

-- إدراج الإعدادات العامة للنظام
INSERT INTO public.system_settings (setting_key, setting_value) VALUES
('system_info', '{
  "name": "منصة إدارة الوكالات الإعلانية",
  "version": "1.0.0",
  "description": "نظام شامل لإدارة الوكالات الإعلانية والتسويقية",
  "logo_url": "/system-logo.png",
  "support_email": "support@agency-platform.com",
  "support_phone": "+966501234567"
}'::jsonb),

('platform_settings', '{
  "allow_registration": true,
  "require_email_verification": true,
  "trial_period_days": 14,
  "max_agencies_per_user": 3,
  "default_agency_plan": "basic",
  "maintenance_mode": false
}'::jsonb),

('notification_settings', '{
  "email_notifications": true,
  "sms_notifications": false,
  "push_notifications": true,
  "admin_notifications": {
    "new_agency_registration": true,
    "payment_failures": true,
    "subscription_cancellations": true
  }
}'::jsonb)

ON CONFLICT (setting_key) DO NOTHING;