-- تفعيل الامتدادات المطلوبة لـ Cron Jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- إنشاء دالة لإرسال إشعار عند تسجيل دفعة جديدة
CREATE OR REPLACE FUNCTION public.notify_payment_logged()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- استدعاء edge function للإشعار بالدفعة الجديدة
  PERFORM net.http_post(
    url := 'https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/notify-new-payment',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := jsonb_build_object('payment_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;

-- إنشاء trigger لإشعار الدفعات
DROP TRIGGER IF EXISTS trigger_notify_payment_logged ON public.payments;
CREATE TRIGGER trigger_notify_payment_logged
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_payment_logged();

-- إنشاء دالة لإرسال إشعار عند تسجيل مصروف جديد
CREATE OR REPLACE FUNCTION public.notify_expense_logged()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- استدعاء edge function للإشعار بالمصروف الجديد
  PERFORM net.http_post(
    url := 'https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/notify-new-expense',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := jsonb_build_object('expense_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;

-- إنشاء trigger لإشعار المصروفات
DROP TRIGGER IF EXISTS trigger_notify_expense_logged ON public.expenses;
CREATE TRIGGER trigger_notify_expense_logged
  AFTER INSERT ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_expense_logged();

-- إنشاء Cron Job للتقرير المالي اليومي عند منتصف الليل (00:00)
SELECT cron.schedule(
  'daily-financial-report-midnight',
  '0 0 * * *', -- كل يوم عند منتصف الليل (00:00)
  $$
  SELECT
    net.http_post(
      url := 'https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/daily-financial-report',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcnprZnBvd2p1dHlsZWdkY3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MzU5NzIsImV4cCI6MjA3NDQxMTk3Mn0.frZ6OBDDuqbXOmQUydyoLdCnI5n5_WnS96x2qMPNR78'
      ),
      body := jsonb_build_object('time', now())
    );
  $$
);

-- إنشاء Cron Jobs للتحقق من التأخيرات (كل ساعة)
SELECT cron.schedule(
  'check-delivery-delays',
  '0 * * * *', -- كل ساعة
  $$
  SELECT
    net.http_post(
      url := 'https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/notify-delivery-delay',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcnprZnBvd2p1dHlsZWdkY3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MzU5NzIsImV4cCI6MjA3NDQxMTk3Mn0.frZ6OBDDuqbXOmQUydyoLdCnI5n5_WnS96x2qMPNR78'
      ),
      body := jsonb_build_object('time', now())
    );
  $$
);

SELECT cron.schedule(
  'check-payment-delays',
  '0 * * * *', -- كل ساعة
  $$
  SELECT
    net.http_post(
      url := 'https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/notify-payment-delay',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcnprZnBvd2p1dHlsZWdkY3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MzU5NzIsImV4cCI6MjA3NDQxMTk3Mn0.frZ6OBDDuqbXOmQUydyoLdCnI5n5_WnS96x2qMPNR78'
      ),
      body := jsonb_build_object('time', now())
    );
  $$
);