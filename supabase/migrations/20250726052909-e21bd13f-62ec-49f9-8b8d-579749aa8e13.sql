-- تعطيل الـ triggers مؤقتاً
ALTER TABLE public.orders DISABLE TRIGGER ALL;

-- تحديث جميع الحالات غير الصحيحة
UPDATE public.orders 
SET status = CASE 
  WHEN status NOT IN ('جديد', 'قيد المعالجة', 'مكتمل', 'ملغي', 'مؤجل', 'في انتظار الدفع', 'جاهز للتسليم') 
  THEN 'قيد المعالجة'
  ELSE status
END;

-- حذف القيد الحالي
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

-- إضافة القيد الجديد
ALTER TABLE public.orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('جديد', 'قيد المعالجة', 'مكتمل', 'ملغي', 'مؤجل', 'في انتظار الدفع', 'جاهز للتسليم'));

-- إعادة تفعيل الـ triggers
ALTER TABLE public.orders ENABLE TRIGGER ALL;