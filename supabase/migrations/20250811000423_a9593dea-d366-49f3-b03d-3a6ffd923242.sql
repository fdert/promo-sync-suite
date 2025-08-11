-- إضافة دور super_admin لمدير النظام
INSERT INTO user_roles (user_id, role)
VALUES ('5f1cdf1d-f44a-4250-9675-cf5e5d5fd4e7', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;