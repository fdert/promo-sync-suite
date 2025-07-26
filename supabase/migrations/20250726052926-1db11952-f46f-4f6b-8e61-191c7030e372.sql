-- حذف القيد الحالي أولاً
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

-- تحديث جميع الحالات غير الصحيحة مباشرة
UPDATE public.orders 
SET status = 'قيد المعالجة'
WHERE status = 'قيد المراجعة' OR status = 'معلق' OR status NOT IN ('جديد', 'قيد المعالجة', 'مكتمل', 'ملغي', 'مؤجل', 'في انتظار الدفع', 'جاهز للتسليم');

-- إضافة القيد الجديد مع جميع الحالات
ALTER TABLE public.orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('جديد', 'قيد المعالجة', 'مكتمل', 'ملغي', 'مؤجل', 'في انتظار الدفع', 'جاهز للتسليم'));