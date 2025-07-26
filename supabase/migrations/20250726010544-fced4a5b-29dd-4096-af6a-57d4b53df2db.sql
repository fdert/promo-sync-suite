-- Update the function to not use pg_net, instead store webhook requests for processing
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
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

  -- إضافة إشعار داخلي
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

  -- Store webhook notification request in a simple way
  -- This will be processed by the application layer
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'webhook_order_notification',
    jsonb_build_object(
      'type', notification_type,
      'order_id', NEW.id,
      'order_number', NEW.order_number,
      'status', NEW.status,
      'customer_id', NEW.customer_id,
      'amount', NEW.amount,
      'service_name', NEW.service_name,
      'updated_at', NEW.updated_at
    )::text,
    'webhook'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;