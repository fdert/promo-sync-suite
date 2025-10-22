-- إصلاح trigger إشعار الدفعات الجديدة
-- المشكلة: استخدام ->> على نوع text
-- الحل: استخدام service role key مباشرة أو إزالة Authorization header

DROP TRIGGER IF EXISTS on_payment_insert_notify ON public.payments;
DROP FUNCTION IF EXISTS public.trigger_notify_new_payment();

CREATE OR REPLACE FUNCTION public.trigger_notify_new_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- استدعاء edge function لإرسال إشعار واتساب بالدفعة الجديدة
  -- استخدام service role key بدلاً من JWT token
  PERFORM net.http_post(
    url := 'https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/notify-new-payment',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key', true)
    ),
    body := jsonb_build_object(
      'payment_id', NEW.id,
      'test', false
    )
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- لا نفشل عملية إدخال الدفعة في حالة فشل الإشعار
    RAISE WARNING 'Failed to notify payment: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- إنشاء trigger على جدول payments
CREATE TRIGGER on_payment_insert_notify
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_new_payment();