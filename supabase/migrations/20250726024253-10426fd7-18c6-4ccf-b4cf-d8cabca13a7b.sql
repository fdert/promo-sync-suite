-- إزالة القيد القديم وإضافة قيد جديد يدعم الحالات العربية الصحيحة
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

-- إضافة قيد جديد يدعم جميع الحالات العربية المطلوبة
ALTER TABLE public.invoices 
ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('قيد الانتظار', 'مدفوعة', 'مدفوع', 'متأخرة', 'متأخر', 'ملغية', 'ملغي', 'مكتملة', 'مكتمل'));