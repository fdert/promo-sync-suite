-- تفعيل pg_cron و pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- جدولة إشعار تجاوز فترة التسليم (يومياً الساعة 12 ظهراً)
SELECT cron.schedule(
  'notify-delivery-delay-daily',
  '0 12 * * *', -- كل يوم الساعة 12 ظهراً
  $$
  SELECT
    net.http_post(
        url:='https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/notify-delivery-delay',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcnprZnBvd2p1dHlsZWdkY3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MzU5NzIsImV4cCI6MjA3NDQxMTk3Mn0.frZ6OBDDuqbXOmQUydyoLdCnI5n5_WnS96x2qMPNR78"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- جدولة إشعار تأخير المدفوعات (يومياً الساعة 17 مساءً - 5 PM)
SELECT cron.schedule(
  'notify-payment-delay-daily',
  '0 17 * * *', -- كل يوم الساعة 5 مساءً
  $$
  SELECT
    net.http_post(
        url:='https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/notify-payment-delay',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcnprZnBvd2p1dHlsZWdkY3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MzU5NzIsImV4cCI6MjA3NDQxMTk3Mn0.frZ6OBDDuqbXOmQUydyoLdCnI5n5_WnS96x2qMPNR78"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);