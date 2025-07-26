-- حذف جميع الـ triggers أولاً ثم الدوال
DROP TRIGGER IF EXISTS trigger_invoice_event ON public.invoices;
DROP TRIGGER IF EXISTS notify_invoice_events ON public.invoices;
DROP TRIGGER IF EXISTS notify_invoice_events_simple ON public.invoices;
DROP TRIGGER IF EXISTS notify_order_status_change ON public.orders;

-- الآن حذف الدوال
DROP FUNCTION IF EXISTS public.notify_invoice_event() CASCADE;
DROP FUNCTION IF EXISTS public.notify_invoice_event_simple() CASCADE;
DROP FUNCTION IF EXISTS public.notify_order_status_change() CASCADE;

-- إنشاء دالة بسيطة للطلبات فقط
CREATE OR REPLACE FUNCTION public.simple_order_notification()
RETURNS TRIGGER AS $$
BEGIN
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