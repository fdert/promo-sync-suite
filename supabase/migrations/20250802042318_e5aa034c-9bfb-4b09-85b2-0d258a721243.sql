-- حذف policies القديمة إذا كانت موجودة  
DROP POLICY IF EXISTS "Allow authenticated users to upload print files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view print files" ON storage.objects; 
DROP POLICY IF EXISTS "Allow authenticated users to update print files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete print files" ON storage.objects;

-- إنشاء policies جديدة أكثر مرونة
CREATE POLICY "Allow print files upload" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'print-files');

CREATE POLICY "Allow print files view" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'print-files');

CREATE POLICY "Allow print files update" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'print-files');

CREATE POLICY "Allow print files delete" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'print-files');