-- إضافة المستخدم الحالي إلى الوكالة الافتراضية
INSERT INTO public.agency_members (
  agency_id,
  user_id,
  role,
  is_active,
  created_by
) 
SELECT 
  a.id,
  '336f6e48-78c8-4bd3-975d-ad3e3f41afdd',
  'owner',
  true,
  '336f6e48-78c8-4bd3-975d-ad3e3f41afdd'
FROM public.agencies a 
WHERE a.slug = 'default-agency'
AND NOT EXISTS (
  SELECT 1 FROM public.agency_members am 
  WHERE am.agency_id = a.id 
  AND am.user_id = '336f6e48-78c8-4bd3-975d-ad3e3f41afdd'
);

-- إضافة دور إدارة للمستخدم الحالي
INSERT INTO public.user_roles (
  user_id,
  role
) VALUES (
  '336f6e48-78c8-4bd3-975d-ad3e3f41afdd',
  'admin'
) ON CONFLICT (user_id, role) DO NOTHING;

-- تحديث بيانات الوكالة الافتراضية لتتناسب مع المستخدم الحالي  
UPDATE public.agencies 
SET 
  name = 'وكالة الدعاية والإعلان الافتراضية',
  contact_email = 'fm@gmail.com',
  primary_color = '#2563eb',
  secondary_color = '#7c3aed',
  contact_phone = '+966501234567',
  address = 'الرياض، المملكة العربية السعودية',
  website = 'https://example.com',
  subscription_plan = 'premium',
  max_users = 100,
  max_customers = 1000,
  max_storage_gb = 100
WHERE slug = 'default-agency';