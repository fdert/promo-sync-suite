-- إضافة صلاحية قراءة عامة لجدول website_settings
DROP POLICY IF EXISTS "الجميع يمكنهم قراءة إعدادات الموقع" ON website_settings;

CREATE POLICY "الجميع يمكنهم قراءة إعدادات الموقع"
ON website_settings
FOR SELECT
TO public
USING (true);