-- حذف الـ cron job القديم
SELECT cron.unschedule('daily-database-backup');

-- إنشاء cron job جديد باستخدام anon key (بعد أن نجعل الوظيفة public)
SELECT cron.schedule(
  'daily-database-backup',
  '0 2 * * *', -- يومياً في الساعة 2 صباحاً بتوقيت السيرفر
  $$
  SELECT
    net.http_post(
      url := 'https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/send-daily-backup',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcnprZnBvd2p1dHlsZWdkY3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MzU5NzIsImV4cCI6MjA3NDQxMTk3Mn0.frZ6OBDDuqbXOmQUydyoLdCnI5n5_WnS96x2qMPNR78"}'::jsonb,
      body := '{"scheduled": true, "cron_secret": "daily-backup-cron-2025"}'::jsonb
    ) as request_id;
  $$
);