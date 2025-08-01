-- حذف المستخدم الافتراضي وإعادة إنشاؤه بطريقة صحيحة
DELETE FROM auth.identities WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

-- إنشاء المستخدم الافتراضي بشكل صحيح
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
  email_change,
  email_change_token_current,
  email_change_token_new,
  phone_change,
  phone_change_token,
  confirmation_token,
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
  '',
  '',
  '',
  '',
  ''
);

-- إضافة هوية المستخدم
INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  'admin@ibdaa-adv.com',
  '00000000-0000-0000-0000-000000000001'::uuid,
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@ibdaa-adv.com","email_verified":true,"phone_verified":false}',
  'email',
  now(),
  now(),
  now()
);