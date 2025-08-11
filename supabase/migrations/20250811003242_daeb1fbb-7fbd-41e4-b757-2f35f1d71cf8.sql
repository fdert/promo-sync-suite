-- حذف السياسات الحالية
DROP POLICY IF EXISTS "السماح بإنشاء وكالات جديدة" ON public.agencies;
DROP POLICY IF EXISTS "Super admin can create agencies" ON public.agencies;
DROP POLICY IF EXISTS "System admins can create agencies" ON public.agencies;

-- إنشاء سياسة بسيطة للسماح للمستخدمين المؤكدين بإنشاء وكالات
CREATE POLICY "Allow authenticated users to create agencies"
ON public.agencies
FOR INSERT
TO authenticated
WITH CHECK (true);