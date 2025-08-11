-- إضافة دور admin للمستخدم محمد جعفر
INSERT INTO user_roles (user_id, role, assigned_by)
VALUES ('4f6cc8fc-e006-4bf6-9802-5e6ce121c2a5', 'admin', '4f6cc8fc-e006-4bf6-9802-5e6ce121c2a5')
ON CONFLICT (user_id, role) DO NOTHING;