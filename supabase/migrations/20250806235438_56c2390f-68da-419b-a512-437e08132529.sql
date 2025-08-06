-- إنشاء cron job لمعالجة رسائل التقييم كل دقيقة
SELECT cron.schedule(
  'process-google-review-messages',
  '* * * * *', -- كل دقيقة
  $$
  SELECT net.http_post(
    url := 'https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/send-google-review-messages',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);