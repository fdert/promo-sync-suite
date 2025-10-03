-- إنشاء دالة لتحديث المبالغ المدفوعة في جدول الطلبات
CREATE OR REPLACE FUNCTION public.update_order_paid_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_paid NUMERIC;
BEGIN
  -- حساب إجمالي المدفوعات للطلب
  SELECT COALESCE(SUM(amount), 0)
  INTO total_paid
  FROM public.payments
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
  
  -- تحديث المبلغ المدفوع في جدول الطلبات
  UPDATE public.orders
  SET paid_amount = total_paid,
      updated_at = NOW()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- إنشاء trigger عند إضافة دفعة جديدة
CREATE TRIGGER trigger_update_order_paid_on_insert
AFTER INSERT ON public.payments
FOR EACH ROW
WHEN (NEW.order_id IS NOT NULL)
EXECUTE FUNCTION public.update_order_paid_amount();

-- إنشاء trigger عند تحديث دفعة
CREATE TRIGGER trigger_update_order_paid_on_update
AFTER UPDATE ON public.payments
FOR EACH ROW
WHEN (NEW.order_id IS NOT NULL OR OLD.order_id IS NOT NULL)
EXECUTE FUNCTION public.update_order_paid_amount();

-- إنشاء trigger عند حذف دفعة
CREATE TRIGGER trigger_update_order_paid_on_delete
AFTER DELETE ON public.payments
FOR EACH ROW
WHEN (OLD.order_id IS NOT NULL)
EXECUTE FUNCTION public.update_order_paid_amount();

-- تحديث جميع المبالغ المدفوعة الحالية للطلبات
UPDATE public.orders o
SET paid_amount = COALESCE((
  SELECT SUM(amount)
  FROM public.payments p
  WHERE p.order_id = o.id
), 0);