-- إزالة RLS مؤقتاً ثم إعادة تطبيقه
ALTER TABLE public.agencies DISABLE ROW LEVEL SECURITY;

-- إعادة تفعيل RLS مع إنشاء سياسة جديدة مبسطة
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- حذف جميع السياسات الموجودة
DROP POLICY IF EXISTS "Allow authenticated users to create agencies" ON public.agencies;
DROP POLICY IF EXISTS "أصحاب الوكالات يمكنهم تحديثها" ON public.agencies;
DROP POLICY IF EXISTS "المستخدمون يمكنهم رؤية وكالاتهم ف" ON public.agencies;

-- إنشاء سياسات جديدة مبسطة
CREATE POLICY "authenticated_insert_agencies"
ON public.agencies
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_select_agencies"
ON public.agencies
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_update_agencies"
ON public.agencies
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "authenticated_delete_agencies"
ON public.agencies
FOR DELETE
TO authenticated
USING (true);