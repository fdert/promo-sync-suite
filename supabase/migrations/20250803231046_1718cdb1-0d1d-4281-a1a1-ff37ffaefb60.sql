-- تحويل bucket الملفات إلى public لضمان عمل الروابط العامة
UPDATE storage.buckets 
SET public = true 
WHERE id = 'print-files';