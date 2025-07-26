-- حذف الـ trigger المسبب للمشكلة مؤقتاً حتى نصلح دالة الإشعارات
DROP TRIGGER IF EXISTS notify_invoice_events ON public.invoices;

-- إنشاء دالة بديلة مبسطة للإشعارات (بدون استخدام net.http_post)
CREATE OR REPLACE FUNCTION public.notify_invoice_event_simple()
RETURNS TRIGGER AS $$
BEGIN
  -- إضافة إشعار داخلي فقط
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type
  ) VALUES (
    NEW.created_by,
    'تحديث الفاتورة',
    'تم إنشاء الفاتورة ' || NEW.invoice_number || ' بحالة: ' || NEW.status,
    'info'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger جديد يستخدم الدالة المبسطة
CREATE TRIGGER notify_invoice_events_simple
  AFTER INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_invoice_event_simple();