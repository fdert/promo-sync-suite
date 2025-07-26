-- حذف جميع الـ triggers والدوال المتعلقة بالإشعارات لحل مشكلة net.http_post

-- حذف جميع الـ triggers
DROP TRIGGER IF EXISTS notify_invoice_events ON public.invoices;
DROP TRIGGER IF EXISTS notify_invoice_events_simple ON public.invoices;
DROP TRIGGER IF EXISTS notify_order_status_change ON public.orders;

-- حذف الدوال القديمة
DROP FUNCTION IF EXISTS public.notify_invoice_event();
DROP FUNCTION IF EXISTS public.notify_invoice_event_simple();
DROP FUNCTION IF EXISTS public.notify_order_status_change();

-- إنشاء دالة بسيطة جداً للطلبات فقط (بدون استخدام net)
CREATE OR REPLACE FUNCTION public.simple_order_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- إدراج إشعار بسيط في جدول الإشعارات
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type
    ) VALUES (
      NEW.created_by,
      'تحديث حالة الطلب',
      'تم تحديث حالة الطلب ' || NEW.order_number || ' إلى: ' || NEW.status,
      'info'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- إضافة trigger للطلبات فقط
CREATE TRIGGER simple_order_notification_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.simple_order_notification();