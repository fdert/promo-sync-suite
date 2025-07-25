-- إصلاح مشاكل الصلاحيات وتحديث السياسات

-- إصلاح سياسة الصلاحيات للسماح للمدراء بإدارة صلاحيات المستخدمين
DROP POLICY IF EXISTS "المدراء يمكنهم إدارة الصلاحيات" ON public.user_permissions;

CREATE POLICY "المدراء يمكنهم إدارة الصلاحيات" 
ON public.user_permissions 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR
  user_id = auth.uid()
);

-- تحديث سياسة user_roles للسماح للمدراء بتحديث الأدوار
DROP POLICY IF EXISTS "المدراء يمكنهم إدارة الأدوار" ON public.user_roles;

CREATE POLICY "المدراء يمكنهم إدارة الأدوار" 
ON public.user_roles 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager')
);

-- إعطاء صلاحيات admin للمستخدم الحالي مؤقتاً
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = '90b43c58-7b69-4cae-9e8d-854a5a4c8ffb';

-- إضافة صلاحيات كاملة للمستخدم الحالي
INSERT INTO public.user_permissions (user_id, permission) 
VALUES 
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'orders_view'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'orders_create'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'orders_edit'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'orders_delete'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'customers_view'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'customers_create'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'customers_edit'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'customers_delete'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'invoices_view'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'invoices_create'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'invoices_edit'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'invoices_delete'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'users_view'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'users_create'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'users_edit'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'users_delete'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'reports_view'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'reports_create'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'reports_export'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'accounts_view'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'accounts_create'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'accounts_edit'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'accounts_delete'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'settings_view'),
  ('90b43c58-7b69-4cae-9e8d-854a5a4c8ffb', 'settings_edit')
ON CONFLICT (user_id, permission) DO NOTHING;