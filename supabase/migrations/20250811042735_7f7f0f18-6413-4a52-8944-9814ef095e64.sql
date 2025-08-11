-- إضافة دور الأدمن للمستخدم الحالي
-- يجب تشغيل هذا بعد تسجيل الدخول لمعرف المستخدم الصحيح

-- أولاً نحذف أي أدوار موجودة للمستخدم (في حالة وجودها)
DELETE FROM public.user_roles 
WHERE user_id = auth.uid();

-- ثم نضيف دور الأدمن
INSERT INTO public.user_roles (user_id, role)
VALUES (auth.uid(), 'admin')
ON CONFLICT (user_id, role) DO NOTHING;