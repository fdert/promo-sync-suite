-- إنشاء bucket للأصول (الشعارات وملفات الشركة)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'company-assets', 
  'company-assets', 
  true, 
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
);

-- إنشاء سياسات للوصول للأصول
CREATE POLICY "الجميع يمكنهم رؤية أصول الشركة"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-assets');

CREATE POLICY "المدراء يمكنهم رفع أصول الشركة"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-assets' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "المدراء يمكنهم حذف أصول الشركة"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-assets' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "المدراء يمكنهم تحديث أصول الشركة"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-assets' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);