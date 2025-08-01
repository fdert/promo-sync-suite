-- إنشاء bucket جديد للشعارات إذا لم يكن موجود
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- سياسات الأمان للشعارات - المدراء يمكنهم الرفع والإدارة
CREATE POLICY "المدراء يمكنهم رفع الشعارات"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'logos' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "المدراء يمكنهم تحديث الشعارات"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'logos' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "المدراء يمكنهم حذف الشعارات"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'logos' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "الجميع يمكنهم مشاهدة الشعارات"
ON storage.objects
FOR SELECT
USING (bucket_id = 'logos');

-- تحديث سياسات bucket order-attachments للمدراء أيضاً
CREATE POLICY "المدراء يمكنهم الرفع في المرفقات"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'order-attachments' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role))
);

CREATE POLICY "المدراء يمكنهم مشاهدة المرفقات"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'order-attachments' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role))
);