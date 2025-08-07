-- تعديل دالة check_delivery_delays لاستخدام نفس نظام الواتس
CREATE OR REPLACE FUNCTION public.check_delivery_delays()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    settings_record RECORD;
    order_record RECORD;
    message_content TEXT;
BEGIN
    -- جلب إعدادات المتابعة
    SELECT * INTO settings_record FROM follow_up_settings LIMIT 1;
    
    -- التحقق من تفعيل الإشعار
    IF settings_record.send_whatsapp_on_delivery_delay = false OR 
       settings_record.follow_up_whatsapp IS NULL OR 
       settings_record.follow_up_whatsapp = '' THEN
        RETURN;
    END IF;
    
    -- البحث عن الطلبات المتأخرة
    FOR order_record IN 
        SELECT o.*, c.name as customer_name, c.phone as customer_phone
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.due_date < CURRENT_DATE - INTERVAL '1 day' * settings_record.delivery_delay_days
        AND o.status NOT IN ('مكتمل', 'ملغي')
        AND NOT EXISTS (
            SELECT 1 FROM whatsapp_messages wm 
            WHERE wm.message_type = 'delivery_delay_notification'
            AND wm.to_number = settings_record.follow_up_whatsapp
            AND wm.message_content LIKE '%' || order_record.order_number || '%'
            AND DATE(wm.created_at) = CURRENT_DATE
        )
    LOOP
        -- إعداد محتوى الرسالة
        message_content := '⚠️ تأخير في التسليم' || E'\n\n' ||
                          '📋 رقم الطلب: ' || order_record.order_number || E'\n' ||
                          '👤 العميل: ' || COALESCE(order_record.customer_name, 'غير محدد') || E'\n' ||
                          '📱 رقم العميل: ' || COALESCE(order_record.customer_phone, 'غير محدد') || E'\n' ||
                          '🛍️ الخدمة: ' || order_record.service_name || E'\n' ||
                          '💰 المبلغ: ' || order_record.amount || ' ر.س' || E'\n' ||
                          '📅 تاريخ الاستحقاق: ' || order_record.due_date || E'\n' ||
                          '🔄 الحالة الحالية: ' || order_record.status || E'\n' ||
                          '📊 التقدم: ' || order_record.progress || '%' || E'\n\n' ||
                          '🚨 يتطلب متابعة عاجلة!' || E'\n\n' ||
                          '⏰ تم الإرسال: ' || TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI');
        
        -- حفظ رسالة تأخير التسليم في نفس جدول الواتس
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
            'delivery_delay_notification',
            message_content,
            'pending',
            order_record.customer_id,
            NOW()
        );
        
        RAISE LOG 'تم إنشاء رسالة تأخير التسليم للطلب: %', order_record.order_number;
    END LOOP;
    
    RAISE LOG 'تم الانتهاء من فحص تأخير التسليم';
END;
$function$;

-- تعديل دالة check_payment_delays لاستخدام نفس نظام الواتس
CREATE OR REPLACE FUNCTION public.check_payment_delays()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    settings_record RECORD;
    order_record RECORD;
    message_content TEXT;
    remaining_amount NUMERIC;
BEGIN
    -- جلب إعدادات المتابعة
    SELECT * INTO settings_record FROM follow_up_settings LIMIT 1;
    
    -- التحقق من تفعيل الإشعار
    IF settings_record.send_whatsapp_on_payment_delay = false OR 
       settings_record.follow_up_whatsapp IS NULL OR 
       settings_record.follow_up_whatsapp = '' THEN
        RETURN;
    END IF;
    
    -- البحث عن الطلبات ذات المدفوعات المتأخرة
    FOR order_record IN 
        SELECT 
            o.*,
            c.name as customer_name, 
            c.phone as customer_phone,
            COALESCE(SUM(p.amount), 0) as paid_amount
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN payments p ON o.id = p.order_id
        WHERE o.payment_type = 'دفع آجل'
        AND o.due_date < CURRENT_DATE - INTERVAL '1 day' * settings_record.payment_delay_days
        AND o.status NOT IN ('مكتمل', 'ملغي')
        GROUP BY o.id, c.name, c.phone
        HAVING o.amount > COALESCE(SUM(p.amount), 0)
        AND NOT EXISTS (
            SELECT 1 FROM whatsapp_messages wm 
            WHERE wm.message_type = 'payment_delay_notification'
            AND wm.to_number = settings_record.follow_up_whatsapp
            AND wm.message_content LIKE '%' || o.order_number || '%'
            AND DATE(wm.created_at) = CURRENT_DATE
        )
    LOOP
        -- حساب المبلغ المتبقي
        remaining_amount := order_record.amount - COALESCE(order_record.paid_amount, 0);
        
        -- إعداد محتوى الرسالة
        message_content := '💳 تأخير في الدفع' || E'\n\n' ||
                          '📋 رقم الطلب: ' || order_record.order_number || E'\n' ||
                          '👤 العميل: ' || COALESCE(order_record.customer_name, 'غير محدد') || E'\n' ||
                          '📱 رقم العميل: ' || COALESCE(order_record.customer_phone, 'غير محدد') || E'\n' ||
                          '🛍️ الخدمة: ' || order_record.service_name || E'\n' ||
                          '💰 إجمالي المبلغ: ' || order_record.amount || ' ر.س' || E'\n' ||
                          '💵 المبلغ المدفوع: ' || COALESCE(order_record.paid_amount, 0) || ' ر.س' || E'\n' ||
                          '🔴 المبلغ المتبقي: ' || remaining_amount || ' ر.س' || E'\n' ||
                          '📅 تاريخ الاستحقاق: ' || order_record.due_date || E'\n' ||
                          '🔄 الحالة الحالية: ' || order_record.status || E'\n\n' ||
                          '🚨 يتطلب متابعة الدفع!' || E'\n\n' ||
                          '⏰ تم الإرسال: ' || TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI');
        
        -- حفظ رسالة تأخير الدفع في نفس جدول الواتس
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
            'payment_delay_notification',
            message_content,
            'pending',
            order_record.customer_id,
            NOW()
        );
        
        RAISE LOG 'تم إنشاء رسالة تأخير الدفع للطلب: %', order_record.order_number;
    END LOOP;
    
    RAISE LOG 'تم الانتهاء من فحص تأخير الدفع';
END;
$function$;

-- إنشاء دالة لإرسال رسالة الطلب الجديد للإدارة
CREATE OR REPLACE FUNCTION public.send_new_order_to_management()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    settings_record RECORD;
    customer_record RECORD;
    message_content TEXT;
BEGIN
    -- التحقق من أن هذا طلب جديد
    IF TG_OP != 'INSERT' THEN
        RETURN NEW;
    END IF;
    
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
    FROM customers 
    WHERE id = NEW.customer_id;
    
    -- إعداد محتوى الرسالة
    message_content := '🆕 طلب جديد في النظام' || E'\n\n' ||
                      '📋 رقم الطلب: ' || NEW.order_number || E'\n' ||
                      '👤 العميل: ' || COALESCE(customer_record.name, 'غير محدد') || E'\n' ||
                      '📱 رقم العميل: ' || COALESCE(customer_record.whatsapp_number, customer_record.phone, 'غير محدد') || E'\n' ||
                      '🛍️ الخدمة: ' || NEW.service_name || E'\n' ||
                      '💰 المبلغ: ' || NEW.amount || ' ر.س' || E'\n' ||
                      '📅 تاريخ الاستحقاق: ' || COALESCE(NEW.due_date::text, 'غير محدد') || E'\n' ||
                      '🔥 الأولوية: ' || NEW.priority || E'\n' ||
                      '📝 الوصف: ' || COALESCE(NEW.description, 'لا يوجد') || E'\n\n' ||
                      '⏰ تم الإنشاء: ' || TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI');
    
    -- حفظ رسالة الطلب الجديد للإدارة
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
        'new_order_notification',
        message_content,
        'pending',
        NEW.customer_id,
        NOW()
    );
    
    RAISE LOG 'تم إنشاء رسالة طلب جديد للإدارة: %', NEW.order_number;
    
    RETURN NEW;
END;
$function$;

-- إنشاء trigger لإرسال رسالة الطلب الجديد للإدارة
DROP TRIGGER IF EXISTS send_new_order_to_management_trigger ON orders;
CREATE TRIGGER send_new_order_to_management_trigger
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION send_new_order_to_management();

-- إنشاء cron jobs لفحص التأخيرات (يتم تشغيلها مرة واحدة يومياً في الساعة 9 صباحاً)
SELECT cron.schedule(
    'check-delivery-delays',
    '0 9 * * *', -- كل يوم في الساعة 9 صباحاً
    $$SELECT check_delivery_delays();$$
);

SELECT cron.schedule(
    'check-payment-delays', 
    '0 9 * * *', -- كل يوم في الساعة 9 صباحاً
    $$SELECT check_payment_delays();$$
);

-- حذف webhook المتابعة القديم إذا كان موجود
DELETE FROM webhook_settings WHERE webhook_name = 'رسائل المتابعة الداخلية';