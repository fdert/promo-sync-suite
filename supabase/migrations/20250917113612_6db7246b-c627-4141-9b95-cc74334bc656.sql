-- إنشاء bucket للمصروفات إذا لم يكن موجوداً
INSERT INTO storage.buckets (id, name, public) 
VALUES ('expense-receipts', 'expense-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- إنشاء سياسات الحماية للـ bucket
CREATE POLICY "المدراء والموظفون يمكنهم رفع إيصالات المصاريف"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'expense-receipts' 
  AND (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager', 'employee', 'accountant')
    )
  )
);

CREATE POLICY "المدراء والموظفون يمكنهم عرض إيصالات المصاريف"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'expense-receipts' 
  AND (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager', 'employee', 'accountant')
    )
  )
);

CREATE POLICY "المدراء يمكنهم حذف إيصالات المصاريف"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'expense-receipts' 
  AND (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  )
);