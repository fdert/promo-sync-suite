-- إنشاء function لإرسال إشعارات الطلبات تلقائياً
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  webhook_data jsonb;
  notification_type text;
BEGIN
  -- تحديد نوع الإشعار بناءً على الحالة الجديدة
  CASE NEW.status
    WHEN 'جديد' THEN notification_type := 'order_created';
    WHEN 'قيد التنفيذ' THEN notification_type := 'order_in_progress';
    WHEN 'مكتمل' THEN notification_type := 'order_completed';
    WHEN 'ملغي' THEN notification_type := 'order_cancelled';
    ELSE notification_type := 'order_updated';
  END CASE;

  -- تجهيز البيانات للإرسال
  SELECT jsonb_build_object(
    'type', notification_type,
    'data', jsonb_build_object(
      'order_id', NEW.id,
      'order_number', NEW.order_number,
      'status', NEW.status,
      'customer_id', NEW.customer_id,
      'amount', NEW.amount,
      'service_name', NEW.service_name,
      'updated_at', NEW.updated_at
    )
  ) INTO webhook_data;

  -- استدعاء Edge Function لإرسال الإشعار
  PERFORM
    net.http_post(
      url := 'https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/send-order-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdXFmeGFjbmJ4ZGxkc2JtZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0Nzg1MjQsImV4cCI6MjA2OTA1NDUyNH0.jzfLlevMRqw85cwBrTnGRRvut-3g9M1yRiXQB2pw-mc'
      ),
      body := webhook_data
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger للطلبات
DROP TRIGGER IF EXISTS trigger_order_status_change ON public.orders;
CREATE TRIGGER trigger_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_order_status_change();

-- إنشاء function لإرسال إشعارات الفواتير
CREATE OR REPLACE FUNCTION public.notify_invoice_event()
RETURNS TRIGGER AS $$
DECLARE
  webhook_data jsonb;
  notification_type text;
BEGIN
  -- تحديد نوع الإشعار
  IF TG_OP = 'INSERT' THEN
    notification_type := 'invoice_created';
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    CASE NEW.status
      WHEN 'مدفوعة' THEN notification_type := 'invoice_paid';
      WHEN 'متأخرة' THEN notification_type := 'invoice_overdue';
      ELSE notification_type := 'invoice_updated';
    END CASE;
  ELSE
    RETURN NEW;
  END IF;

  -- تجهيز البيانات للإرسال
  SELECT jsonb_build_object(
    'type', notification_type,
    'data', jsonb_build_object(
      'invoice_id', NEW.id,
      'invoice_number', NEW.invoice_number,
      'status', NEW.status,
      'customer_id', NEW.customer_id,
      'amount', NEW.amount,
      'due_date', NEW.due_date,
      'created_at', NEW.created_at
    )
  ) INTO webhook_data;

  -- استدعاء Edge Function لإرسال الإشعار
  PERFORM
    net.http_post(
      url := 'https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/send-invoice-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdXFmeGFjbmJ4ZGxkc2JtZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0Nzg1MjQsImV4cCI6MjA2OTA1NDUyNH0.jzfLlevMRqw85cwBrTnGRRvut-3g9M1yRiXQB2pw-mc'
      ),
      body := webhook_data
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger للفواتير
DROP TRIGGER IF EXISTS trigger_invoice_event ON public.invoices;
CREATE TRIGGER trigger_invoice_event
  AFTER INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_invoice_event();