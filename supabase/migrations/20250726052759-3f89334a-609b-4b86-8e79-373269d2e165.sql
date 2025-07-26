-- تحديث الحالات غير الصحيحة أولاً
UPDATE public.orders 
SET status = 'قيد المعالجة' 
WHERE status IN ('قيد المراجعة', 'معلق');

-- حذف القيد الحالي إن وجد
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

-- إضافة القيد الجديد مع جميع الحالات المطلوبة
ALTER TABLE public.orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('جديد', 'قيد المعالجة', 'مكتمل', 'ملغي', 'مؤجل', 'في انتظار الدفع', 'جاهز للتسليم'));