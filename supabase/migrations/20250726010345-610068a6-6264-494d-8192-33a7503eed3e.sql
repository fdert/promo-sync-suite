-- Update the function to call Edge Function properly using pg_net
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

  -- استدعاء Edge Function لإرسال الإشعار عبر pg_net
  PERFORM pg_net.http_post(
    url := 'https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/send-order-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdXFmeGFjbmJ4ZGxkc2JtZ3ZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ3ODUyNCwiZXhwIjoyMDY5MDU0NTI0fQ.2T7YKdT8P2NvfVvZZXKYDf_Uon9lJPJ_vZ_pOdQ8DPo'
    ),
    body := webhook_data
  );

  -- إضافة إشعار داخلي أيضاً
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;