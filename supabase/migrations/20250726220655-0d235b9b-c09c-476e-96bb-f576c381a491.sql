-- إنشاء حساب إداري افتراضي
-- أولاً، إدراج المستخدم في جدول المصادقة (هذا سيتم يدوياً)
-- ثانياً، إضافة الملف الشخصي والدور

-- إضافة ملف شخصي للمدير الافتراضي
INSERT INTO public.profiles (id, full_name, status) 
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'مدير النظام الافتراضي',
  'active'
);

-- إضافة دور المدير
INSERT INTO public.user_roles (user_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin'
);

-- إضافة جميع الصلاحيات للمدير الافتراضي
INSERT INTO public.user_permissions (user_id, permission)
VALUES 
  ('00000000-0000-0000-0000-000000000001'::uuid, 'manage_users'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'manage_customers'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'manage_orders'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'manage_invoices'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'view_reports'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'manage_accounts'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'manage_evaluations'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'manage_settings'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'manage_message_templates'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'manage_webhooks'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'manage_website_content'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'manage_service_types'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'manage_whatsapp');