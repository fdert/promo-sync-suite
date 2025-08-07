-- إضافة دالة فحص تأخير التسليم
CREATE OR REPLACE FUNCTION public.check_delivery_delays()
RETURNS void
LANGUAGE plpgsql
AS $$
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
$$;

-- إضافة دالة فحص تأخير الدفع
CREATE OR REPLACE FUNCTION public.check_payment_delays()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    settings_record RECORD;
    invoice_record RECORD;
    message_content TEXT;
BEGIN
    -- جلب إعدادات المتابعة
    SELECT * INTO settings_record FROM follow_up_settings LIMIT 1;
    
    -- التحقق من تفعيل الإشعار
    IF settings_record.send_whatsapp_on_payment_delay = false OR 
       settings_record.follow_up_whatsapp IS NULL OR 
       settings_record.follow_up_whatsapp = '' THEN
        RETURN;
    END IF;
    
    -- البحث عن الفواتير المتأخرة
    FOR invoice_record IN 
        SELECT i.*, c.name as customer_name, c.phone as customer_phone,
               (i.total_amount - COALESCE(p.total_paid, 0)) as remaining_amount
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN (
            SELECT invoice_id, SUM(amount) as total_paid
            FROM payments
            GROUP BY invoice_id
        ) p ON p.invoice_id = i.id
        WHERE i.due_date < CURRENT_DATE - INTERVAL '1 day' * settings_record.payment_delay_days
        AND i.status NOT IN ('مدفوعة', 'ملغية')
        AND (i.total_amount - COALESCE(p.total_paid, 0)) > 0
        AND NOT EXISTS (
            SELECT 1 FROM whatsapp_messages wm 
            WHERE wm.message_type = 'payment_delay_notification'
            AND wm.customer_id = i.customer_id
            AND DATE(wm.created_at) = CURRENT_DATE
        )
    LOOP
        -- إعداد محتوى الرسالة
        message_content := '💰 تأخير في السداد' || E'\n\n' ||
                          '📋 رقم الفاتورة: ' || invoice_record.invoice_number || E'\n' ||
                          '👤 العميل: ' || COALESCE(invoice_record.customer_name, 'غير محدد') || E'\n' ||
                          '📱 رقم العميل: ' || COALESCE(invoice_record.customer_phone, 'غير محدد') || E'\n' ||
                          '💵 المبلغ المستحق: ' || invoice_record.remaining_amount || ' ر.س' || E'\n' ||
                          '📅 تاريخ الاستحقاق: ' || invoice_record.due_date || E'\n' ||
                          '🔄 الحالة الحالية: ' || invoice_record.status || E'\n\n' ||
                          '⏰ يتطلب متابعة للسداد!';
        
        -- حفظ رسالة تأخير الدفع
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
            invoice_record.customer_id,
            NOW()
        );
    END LOOP;
END;
$$;

-- إضافة دالة إرسال إشعار طلب جديد للإدارة
CREATE OR REPLACE FUNCTION public.send_new_order_to_management()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    settings_record RECORD;
    customer_record RECORD;
    message_content TEXT;
BEGIN
    -- في حالة إنشاء طلب جديد فقط
    IF TG_OP = 'INSERT' THEN
        -- جلب إعدادات المتابعة
        SELECT * INTO settings_record FROM follow_up_settings LIMIT 1;
        
        -- التحقق من تفعيل الإشعار
        IF settings_record.send_whatsapp_on_new_order = false OR 
           settings_record.follow_up_whatsapp IS NULL OR 
           settings_record.follow_up_whatsapp = '' THEN
            RETURN NEW;
        END IF;
        
        -- جلب بيانات العميل
        SELECT name, phone INTO customer_record
        FROM customers 
        WHERE id = NEW.customer_id;
        
        -- إعداد محتوى الرسالة
        message_content := '🆕 طلب جديد' || E'\n\n' ||
                          '📋 رقم الطلب: ' || NEW.order_number || E'\n' ||
                          '👤 العميل: ' || COALESCE(customer_record.name, 'غير محدد') || E'\n' ||
                          '📱 رقم العميل: ' || COALESCE(customer_record.phone, 'غير محدد') || E'\n' ||
                          '🛍️ الخدمة: ' || NEW.service_name || E'\n' ||
                          '📄 الوصف: ' || COALESCE(NEW.description, 'غير محدد') || E'\n' ||
                          '💵 المبلغ: ' || NEW.amount || ' ر.س' || E'\n' ||
                          '🔄 الحالة: ' || NEW.status || E'\n' ||
                          '⭐ الأولوية: ' || NEW.priority || E'\n' ||
                          '📅 تاريخ البداية: ' || COALESCE(NEW.start_date::text, 'غير محدد') || E'\n' ||
                          '📅 تاريخ الاستحقاق: ' || COALESCE(NEW.due_date::text, 'غير محدد') || E'\n\n' ||
                          '✅ تم إنشاء الطلب بنجاح!';
        
        -- حفظ رسالة الطلب الجديد
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
    END IF;
    
    RETURN NEW;
END;
$$;

-- إنشاء trigger لإرسال إشعار طلب جديد للإدارة
DROP TRIGGER IF EXISTS send_new_order_management_notification ON orders;
CREATE TRIGGER send_new_order_management_notification
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION send_new_order_to_management();

-- إضافة cron jobs لفحص التأخيرات يومياً
SELECT cron.schedule(
  'check-delivery-delays-daily',
  '0 9 * * *', -- كل يوم في 9 صباحاً
  'SELECT public.check_delivery_delays();'
);

SELECT cron.schedule(
  'check-payment-delays-daily',
  '0 10 * * *', -- كل يوم في 10 صباحاً
  'SELECT public.check_payment_delays();'
);