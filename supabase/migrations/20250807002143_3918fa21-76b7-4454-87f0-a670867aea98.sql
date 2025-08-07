-- اختبار إرسال رسالة تقييم جديدة مع Edge Function المحدث
INSERT INTO whatsapp_messages (
  from_number,
  to_number,
  message_type,
  message_content,
  status,
  customer_id,
  created_at
) VALUES (
  'system',
  '+966535983261',
  'text',
  'مرحباً مركز الافاق! 🎉

✅ طلبك رقم: ORD-036 تم إكماله بنجاح!

🌟 نرجو منك تقييم تجربتك معنا على خرائط جوجل:
https://search.google.com/local/writereview?placeid=ChIJL19uXc2vuxURY7wfwdte-cU

تقييمك مهم جداً لنا ويساعدنا على تحسين خدماتنا.

شكراً لاختيارك خدماتنا! 🙏

[FIXED - اختبار التحديث الجديد]',
  'pending',
  '7a00a7d1-52ec-4b39-a838-198def6ec2f3',
  NOW()
);

-- تشغيل Edge Function المحدث
SELECT net.http_post(
  url := 'https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/process-whatsapp-queue',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{}'::jsonb
) as request_id;