-- حذف الـ cron job القديم
SELECT cron.unschedule('daily-database-backup');

-- إنشاء cron job جديد يستخدم service role key
SELECT cron.schedule(
  'daily-database-backup',
  '0 23 * * *', -- يومياً في الساعة 11 مساءً
  $$
  SELECT
    net.http_post(
      url := 'https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/send-daily-backup',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- تسجيل service role key في الإعدادات (سيتم استخدامه في الـ cron job)
-- ملاحظة: يجب تعيين هذا القيمة يدوياً من لوحة Supabase
DO $$
BEGIN
  -- التحقق من وجود الإعداد
  PERFORM set_config('app.settings.service_role_key', current_setting('app.settings.service_role_key', true), false);
EXCEPTION WHEN OTHERS THEN
  -- إذا لم يكن موجوداً، نقوم بتسجيل رسالة
  RAISE NOTICE 'يجب تعيين service_role_key في إعدادات المشروع';
END $$;