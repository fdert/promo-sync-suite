-- إصلاح قيود الحالة في جدول الطلبات
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

-- إضافة القيود الجديدة مع حالة "جاهز للتسليم"
ALTER TABLE public.orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('جديد', 'قيد المعالجة', 'مكتمل', 'ملغي', 'مؤجل', 'في انتظار الدفع', 'جاهز للتسليم'));