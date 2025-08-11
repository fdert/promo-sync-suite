-- إضافة دور super_admin للمستخدم الجديد
INSERT INTO user_roles (user_id, role)
VALUES ('94a007cd-5f02-4af9-b055-e2f6b1ceae00', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;