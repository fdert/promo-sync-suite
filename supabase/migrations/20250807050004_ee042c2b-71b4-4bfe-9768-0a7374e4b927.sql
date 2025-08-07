-- إضافة عمود sent_at للرسائل
ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- إنشاء وظيفة جدولة تلقائية لمعالجة رسائل المتابعة
SELECT cron.schedule(
  'process-follow-up-notifications',
  '* * * * *', -- كل دقيقة
  $$
  SELECT net.http_post(
    url := 'https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/process-follow-up-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdXFmeGFjbmJ4ZGxkc2JtZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0Nzg1MjQsImV4cCI6MjA2OTA1NDUyNH0.jzfLlevMRqw85cwBrTnGRRvut-3g9M1yRiXQB2pw-mc"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);