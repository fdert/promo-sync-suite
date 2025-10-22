-- إنشاء trigger لإشعار بالدفعات الجديدة
CREATE OR REPLACE FUNCTION public.trigger_notify_new_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- استدعاء edge function لإرسال إشعار واتساب بالدفعة الجديدة
  PERFORM net.http_post(
    url := 'https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/notify-new-payment',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::json->>'sub'
    ),
    body := jsonb_build_object(
      'payment_id', NEW.id,
      'test', false
    )
  );
  
  RETURN NEW;
END;
$$;

-- إنشاء trigger على جدول payments
DROP TRIGGER IF EXISTS on_payment_insert_notify ON public.payments;

CREATE TRIGGER on_payment_insert_notify
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_new_payment();