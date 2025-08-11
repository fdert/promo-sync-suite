-- إضافة صلاحية super_admin للمستخدم الحالي
INSERT INTO user_roles (user_id, role) 
VALUES ('737b5f55-7807-46b4-b654-183bc5886f87', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;