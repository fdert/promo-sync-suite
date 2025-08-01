-- إنشاء المستخدم الافتراضي في نظام المصادقة
-- استخدام insert في auth.users مباشرة
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
  raw_user_meta_data,
  raw_app_meta_data,
  is_super_admin,
  confirmation_token,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'authenticated',
  'authenticated',
  'admin@ibdaa-adv.com',
  crypt('AdminIbdaa2025!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"full_name":"مدير النظام الافتراضي"}',
  '{}',
  false,
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- إضافة هوية للمستخدم
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'::uuid,
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@ibdaa-adv.com"}',
  'email',
  now(),
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;