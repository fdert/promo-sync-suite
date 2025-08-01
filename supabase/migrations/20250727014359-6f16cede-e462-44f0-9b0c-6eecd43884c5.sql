-- تمكين الإضافات المطلوبة للـ cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- إنشاء cron job لمعالجة الرسائل المعلقة كل دقيقة
SELECT cron.schedule(
  'process-pending-whatsapp-messages',
  '* * * * *', -- كل دقيقة
  $$
  SELECT
    net.http_post(
        url:='https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/send-pending-whatsapp',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdXFmeGFjbmJ4ZGxkc2JtZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0Nzg1MjQsImV4cCI6MjA2OTA1NDUyNH0.jzfLlevMRqw85cwBrTnGRRvut-3g9M1yRiXQB2pw-mc"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);