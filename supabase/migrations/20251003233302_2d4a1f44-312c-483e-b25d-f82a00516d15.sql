-- إنشاء وظيفة cron لإرسال تقرير الطلبات اليومي عند الساعة 12 منتصف الليل
-- تأكد من تفعيل الإضافات المطلوبة
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- جدولة تقرير الطلبات اليومي
SELECT cron.schedule(
  'send-daily-orders-report',
  '0 0 * * *', -- كل يوم في الساعة 12:00 منتصف الليل
  $$
  SELECT
    net.http_post(
        url:='https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/send-daily-orders-report',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcnprZnBvd2p1dHlsZWdkY3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MzU5NzIsImV4cCI6MjA3NDQxMTk3Mn0.frZ6OBDDuqbXOmQUydyoLdCnI5n5_WnS96x2qMPNR78"}'::jsonb,
        body:=concat('{"scheduled": true, "time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
