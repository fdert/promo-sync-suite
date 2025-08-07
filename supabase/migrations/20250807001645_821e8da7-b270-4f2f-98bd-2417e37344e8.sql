-- إعادة تشغيل رسالة التقييم الأحدث
UPDATE whatsapp_messages 
SET status = 'pending' 
WHERE id = 'ccc6bce9-d73f-4123-951b-04e9da3412ef'
AND status = 'sent';

-- اختبار الكرون جوب مباشرة
SELECT net.http_post(
  url := 'https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/send-pending-whatsapp',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{"review_messages_only": true}'::jsonb
) as request_id;