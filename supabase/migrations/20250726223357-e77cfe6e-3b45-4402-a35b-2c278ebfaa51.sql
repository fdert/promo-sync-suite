-- تحديث دور المستخدم الإداري الافتراضي
UPDATE public.user_roles 
SET role = 'admin'
WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid;

-- التأكد من وجود جميع الصلاحيات للمدير
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
  ('00000000-0000-0000-0000-000000000001'::uuid, 'manage_whatsapp')
ON CONFLICT (user_id, permission) DO NOTHING;