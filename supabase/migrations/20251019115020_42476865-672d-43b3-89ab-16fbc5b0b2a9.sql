-- إضافة سياسة للسماح للمستخدمين المصادق عليهم بمشاهدة الملفات الشخصية الأساسية للمستخدمين الآخرين
-- هذا ضروري لعرض قوائم المستخدمين في التقارير والفلاتر

DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);