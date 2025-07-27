-- إنشاء cron job لمعالجة رسائل الواتس آب المعلقة كل دقيقة
SELECT cron.schedule(
  'process-whatsapp-queue',
  '* * * * *', -- كل دقيقة
  'SELECT net.http_post(url := ''https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/process-whatsapp-queue'', headers := ''{"Content-Type": "application/json"}''::jsonb, body := ''{}''::jsonb) as request_id;'
);