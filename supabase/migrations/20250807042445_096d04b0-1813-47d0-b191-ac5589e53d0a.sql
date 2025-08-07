-- إنشاء trigger لإرسال إشعارات المتابعة الداخلية عند إنشاء طلب جديد
CREATE OR REPLACE FUNCTION send_follow_up_notification()
RETURNS TRIGGER AS $$
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
    
    -- حفظ رسالة المتابعة الداخلية
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
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتطبيق الدالة عند إنشاء طلب جديد
DROP TRIGGER IF EXISTS send_follow_up_notification_trigger ON orders;
CREATE TRIGGER send_follow_up_notification_trigger
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION send_follow_up_notification();

-- إنشاء trigger لإشعارات تأخير التسليم
CREATE OR REPLACE FUNCTION check_delivery_delays()
RETURNS void AS $$
DECLARE
    settings_record RECORD;
    order_record RECORD;
    customer_record RECORD;
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
            AND wm.customer_id = o.customer_id
            AND DATE(wm.created_at) = CURRENT_DATE
        )
    LOOP
        -- إعداد محتوى الرسالة
        message_content := '⚠️ تأخير في التسليم' || E'\n\n' ||
                          '📋 رقم الطلب: ' || order_record.order_number || E'\n' ||
                          '👤 العميل: ' || COALESCE(order_record.customer_name, 'غير محدد') || E'\n' ||
                          '📱 رقم العميل: ' || COALESCE(order_record.customer_phone, 'غير محدد') || E'\n' ||
                          '🛍️ الخدمة: ' || order_record.service_name || E'\n' ||
                          '📅 تاريخ الاستحقاق: ' || order_record.due_date || E'\n' ||
                          '🔄 الحالة الحالية: ' || order_record.status || E'\n' ||
                          '📊 التقدم: ' || order_record.progress || '%' || E'\n\n' ||
                          '🚨 يتطلب متابعة عاجلة!';
        
        -- حفظ رسالة تأخير التسليم
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
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لإشعارات تأخير المدفوعات
CREATE OR REPLACE FUNCTION check_payment_delays()
RETURNS void AS $$
DECLARE
    settings_record RECORD;
    order_record RECORD;
    message_content TEXT;
    total_paid NUMERIC;
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
    
    -- البحث عن الطلبات التي تأخرت مدفوعاتها
    FOR order_record IN 
        SELECT o.*, c.name as customer_name, c.phone as customer_phone
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.created_at::date < CURRENT_DATE - INTERVAL '1 day' * settings_record.payment_delay_days
        AND o.payment_type = 'دفع آجل'
        AND NOT EXISTS (
            SELECT 1 FROM whatsapp_messages wm 
            WHERE wm.message_type = 'payment_delay_notification'
            AND wm.customer_id = o.customer_id
            AND DATE(wm.created_at) = CURRENT_DATE
        )
    LOOP
        -- حساب المبلغ المدفوع
        SELECT COALESCE(SUM(amount), 0) INTO total_paid
        FROM payments 
        WHERE order_id = order_record.id;
        
        remaining_amount := order_record.amount - total_paid;
        
        -- إذا كان هناك مبلغ متبقي
        IF remaining_amount > 0 THEN
            -- إعداد محتوى الرسالة
            message_content := '💰 تأخير في المدفوعات' || E'\n\n' ||
                              '📋 رقم الطلب: ' || order_record.order_number || E'\n' ||
                              '👤 العميل: ' || COALESCE(order_record.customer_name, 'غير محدد') || E'\n' ||
                              '📱 رقم العميل: ' || COALESCE(order_record.customer_phone, 'غير محدد') || E'\n' ||
                              '💵 إجمالي الطلب: ' || order_record.amount || ' ر.س' || E'\n' ||
                              '✅ المدفوع: ' || total_paid || ' ر.س' || E'\n' ||
                              '❌ المتبقي: ' || remaining_amount || ' ر.س' || E'\n' ||
                              '📅 تاريخ الطلب: ' || order_record.created_at::date || E'\n\n' ||
                              '🚨 يتطلب متابعة للدفع!';
            
            -- حفظ رسالة تأخير المدفوعات
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
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;