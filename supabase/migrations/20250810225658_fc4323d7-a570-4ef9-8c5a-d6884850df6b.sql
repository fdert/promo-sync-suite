-- إنشاء وكالة افتراضية ومستخدم إدارة
INSERT INTO public.agencies (
  id,
  name, 
  slug,
  primary_color,
  secondary_color,
  contact_email,
  contact_phone,
  address,
  website,
  is_active,
  subscription_plan,
  max_users,
  max_customers,
  max_storage_gb
) VALUES (
  gen_random_uuid(),
  'وكالة الدعاية والإعلان الافتراضية',
  'default-agency',
  '#2563eb',
  '#7c3aed', 
  'admin@example.com',
  '+966501234567',
  'الرياض، المملكة العربية السعودية',
  'https://example.com',
  true,
  'premium',
  100,
  1000,
  100
) ON CONFLICT (slug) DO NOTHING;

-- إنشاء مستخدم إدارة افتراضي إذا لم يكن موجوداً
INSERT INTO public.customers (
  id,
  name,
  email,
  phone,
  address,
  status,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'مدير النظام',
  'admin@admin.com',
  '+966500000000',
  'الرياض',
  'نشط',
  now()
) ON CONFLICT (email) DO NOTHING;

-- ربط المستخدم بالوكالة كمالك
INSERT INTO public.agency_members (
  agency_id,
  user_id,
  role,
  is_active
) 
SELECT 
  a.id,
  '00000000-0000-0000-0000-000000000001',
  'owner',
  true
FROM public.agencies a 
WHERE a.slug = 'default-agency'
AND NOT EXISTS (
  SELECT 1 FROM public.agency_members am 
  WHERE am.agency_id = a.id 
  AND am.user_id = '00000000-0000-0000-0000-000000000001'
);

-- إضافة دور إدارة للمستخدم
INSERT INTO public.user_roles (
  user_id,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin'
) ON CONFLICT (user_id, role) DO NOTHING;