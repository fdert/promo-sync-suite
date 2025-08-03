-- إضافة مجدول مهام لمعالجة رسائل الواتس اب المعلقة كل دقيقة
select cron.schedule(
  'process-pending-whatsapp',
  '* * * * *', -- كل دقيقة
  $$
  select
    net.http_post(
        url:='https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/send-pending-whatsapp',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdXFmeGFjbmJ4ZGxkc2JtZ3ZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ3ODUyNCwiZXhwIjoyMDY5MDU0NTI0fQ.Rw2oTfR9KfCZBN17Pj0q0c6XEjBKn0jH3_6dkB3hKrs"}'::jsonb,
        body:=concat('{"trigger": "cron", "time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);