-- Drop the existing trigger first
DROP TRIGGER IF EXISTS order_status_change_trigger ON orders;

-- Update the function to use a simpler approach without net.http_post
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

  -- Insert notification record instead of making HTTP call
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER order_status_change_trigger
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_change();