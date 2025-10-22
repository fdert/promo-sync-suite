-- إنشاء دالة لإرسال إشعار عند إنشاء طلب جديد
CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- استدعاء edge function لإرسال إشعار واتساب بالطلب الجديد
  PERFORM net.http_post(
    url := 'https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/notify-new-order',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcnprZnBvd2p1dHlsZWdkY3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MzU5NzIsImV4cCI6MjA3NDQxMTk3Mn0.frZ6OBDDuqbXOmQUydyoLdCnI5n5_WnS96x2qMPNR78'
    ),
    body := jsonb_build_object(
      'order_id', NEW.id,
      'test', false
    )
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- لا نفشل عملية إنشاء الطلب في حالة فشل الإشعار
    RAISE WARNING 'Failed to notify new order: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- إنشاء trigger لإرسال الإشعار عند إنشاء طلب جديد
DROP TRIGGER IF EXISTS trigger_notify_new_order ON public.orders;
CREATE TRIGGER trigger_notify_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_order();