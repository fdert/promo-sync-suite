-- إصلاح سياسة إنشاء الوكالات للسماح للمستخدمين المصرح لهم بإنشاء وكالات جديدة
DROP POLICY IF EXISTS "المدراء يمكنهم إنشاء وكالات" ON public.agencies;

-- سياسة جديدة للسماح للمستخدمين المؤهلين بإنشاء وكالات
CREATE POLICY "السماح بإنشاء وكالات جديدة"
ON public.agencies
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- سياسة للسماح لـ super_admin بإنشاء وكالات
CREATE POLICY "Super admin can create agencies"
ON public.agencies
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- سياسة للسماح لمدراء النظام بإنشاء وكالات
CREATE POLICY "System admins can create agencies"
ON public.agencies
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));