-- حذف الكرون جوب القديم أولاً
SELECT cron.unschedule('process-google-review-messages');

-- إنشاء كرون جوب جديد يستدعم send-pending-whatsapp لرسائل التقييم
SELECT cron.schedule(
  'send-review-messages',
  '* * * * *', -- كل دقيقة
  $$
  SELECT net.http_post(
    url := 'https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/send-pending-whatsapp',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"review_messages_only": true}'::jsonb
  ) as request_id;
  $$
);