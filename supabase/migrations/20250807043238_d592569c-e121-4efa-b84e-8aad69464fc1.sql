-- تعديل trigger إنشاء رسائل المتابعة لتكون بحالة pending
CREATE OR REPLACE FUNCTION public.send_follow_up_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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
        'pending', -- تغيير من sent إلى pending
        NEW.customer_id,
        NOW()
    );
    
    -- استدعاء edge function لمعالجة الرسائل
    PERFORM net.http_post(
        url := 'https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/send-follow-up-messages',
        headers := '{"Content-Type": "application/json"}'::jsonb
    );
    
    RETURN NEW;
END;
$function$;