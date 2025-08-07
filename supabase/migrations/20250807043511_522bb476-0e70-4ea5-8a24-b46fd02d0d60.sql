-- تفعيل امتدادات pg_cron و pg_net
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- إنشاء cron job لمعالجة رسائل المتابعة كل دقيقة
SELECT cron.schedule(
  'process-follow-up-messages',
  '* * * * *', -- كل دقيقة
  $$
  SELECT
    net.http_post(
        url:='https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/send-follow-up-messages',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdXFmeGFjbmJ4ZGxkc2JtZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0Nzg1MjQsImV4cCI6MjA2OTA1NDUyNH0.jzfLlevMRqw85cwBrTnGRRvut-3g9M1yRiXQB2pw-mc"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- تبسيط trigger المتابعة ليقوم بإنشاء الرسالة فقط
CREATE OR REPLACE FUNCTION public.send_follow_up_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    settings_record RECORD;
    customer_record RECORD;
    message_content TEXT;
BEGIN
    -- جلب إعدادات المتابعة
    SELECT * INTO settings_record FROM follow_up_settings LIMIT 1;
    
    -- التحقق من تفعيل الإشعار
    IF settings_record.send_whatsapp_on_new_order = false OR 
       settings_record.follow_up_whatsapp IS NULL OR 
       settings_record.follow_up_whatsapp = '' THEN
        RETURN NEW;
    END IF;
    
    -- جلب بيانات العميل
    SELECT name, phone, whatsapp_number INTO customer_record
    FROM customers WHERE id = NEW.customer_id;
    
    -- إعداد محتوى الرسالة
    message_content := '🆕 طلب جديد في النظام' || E'\n\n' ||
                      '📋 رقم الطلب: ' || NEW.order_number || E'\n' ||
                      '👤 العميل: ' || COALESCE(customer_record.name, 'غير محدد') || E'\n' ||
                      '📱 رقم العميل: ' || COALESCE(customer_record.phone, 'غير محدد') || E'\n' ||
                      '🛍️ الخدمة: ' || NEW.service_name || E'\n' ||
                      '💰 المبلغ: ' || NEW.amount || ' ر.س' || E'\n' ||
                      '📅 تاريخ الاستحقاق: ' || COALESCE(NEW.due_date::text, 'غير محدد') || E'\n' ||
                      '🔥 الأولوية: ' || NEW.priority || E'\n' ||
                      '📝 الوصف: ' || COALESCE(NEW.description, 'غير محدد') || E'\n\n' ||
                      '⏰ تم الإنشاء: ' || TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI');
    
    -- حفظ رسالة المتابعة الداخلية بحالة pending
    INSERT INTO whatsapp_messages (
        from_number,
        to_number,
        message_type,
        message_content,
        status,
        customer_id,
        created_at
    ) VALUES (
        'internal_system',
        settings_record.follow_up_whatsapp,
        'follow_up_notification',
        message_content,
        'pending',
        NEW.customer_id,
        NOW()
    );
    
    RETURN NEW;
END;
$function$;