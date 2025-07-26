-- Fix the function to not use fake user_id for webhook notifications
-- Instead, we'll use the created_by user_id and mark it differently

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

  -- إضافة إشعار داخلي فقط
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