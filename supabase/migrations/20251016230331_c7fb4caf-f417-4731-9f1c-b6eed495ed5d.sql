-- Enable required extensions (safe if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule any existing daily backup job
SELECT cron.unschedule('daily-database-backup');

-- Schedule daily backup at 02:00 (server time)
SELECT cron.schedule(
  'daily-database-backup',
  '0 2 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/send-daily-backup',
      headers := '{"Content-Type":"application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcnprZnBvd2p1dHlsZWdkY3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MzU5NzIsImV4cCI6MjA3NDQxMTk3Mn0.frZ6OBDDuqbXOmQUydyoLdCnI5n5_WnS96x2qMPNR78"}'::jsonb,
      body := '{"scheduled": true, "cron_secret": "daily-backup-cron-2025", "to": "ibdaa.adve@gmail.com"}'::jsonb
    ) AS request_id;
  $$
);