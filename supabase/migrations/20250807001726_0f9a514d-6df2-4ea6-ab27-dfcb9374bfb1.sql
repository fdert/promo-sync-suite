-- اختبار مباشر للإيدج فنكشن بدون معطيات
SELECT net.http_post(
  url := 'https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/send-pending-whatsapp',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{}'::jsonb
) as request_id;