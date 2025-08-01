-- إنشاء trigger لإرسال إشعارات الواتساب عند تغيير حالة الطلب
CREATE OR REPLACE FUNCTION public.send_order_notification()
RETURNS TRIGGER AS $$
DECLARE
    notification_type TEXT;
BEGIN
    -- في حالة تحديث حالة الطلب
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        -- تحديد نوع الإشعار حسب الحالة الجديدة
        CASE NEW.status
            WHEN 'مؤكد' THEN
                notification_type := 'order_confirmed';
            WHEN 'قيد التنفيذ' THEN
                notification_type := 'order_in_progress';
            WHEN 'قيد المراجعة' THEN
                notification_type := 'order_under_review';
            WHEN 'جاهز للتسليم' THEN
                notification_type := 'order_ready_for_delivery';
            WHEN 'مكتمل' THEN
                notification_type := 'order_completed';
            WHEN 'ملغي' THEN
                notification_type := 'order_cancelled';
            WHEN 'في الانتظار' THEN
                notification_type := 'order_on_hold';
            ELSE
                notification_type := 'order_status_updated';
        END CASE;
        
        -- إرسال إشعار عبر edge function
        PERFORM pg_notify('order_notification', json_build_object(
            'type', notification_type,
            'order_id', NEW.id,
            'data', json_build_object(
                'customer_name', (SELECT name FROM customers WHERE id = NEW.customer_id),
                'customer_phone', (SELECT whatsapp_number FROM customers WHERE id = NEW.customer_id),
                'order_number', NEW.order_number,
                'service_name', NEW.service_name,
                'description', NEW.description,
                'amount', NEW.amount,
                'paid_amount', NEW.paid_amount,
                'payment_type', NEW.payment_type,
                'status', NEW.status,
                'priority', NEW.priority,
                'start_date', NEW.start_date,
                'due_date', NEW.due_date,
                'progress', NEW.progress,
                'estimated_days', EXTRACT(DAY FROM (NEW.due_date - CURRENT_DATE))
            )
        )::text);
        
        -- استدعاء edge function مباشرة
        PERFORM http_request(
            'POST',
            'https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/send-order-notifications',
            json_build_object(
                'type', notification_type,
                'order_id', NEW.id,
                'data', json_build_object(
                    'customer_name', (SELECT name FROM customers WHERE id = NEW.customer_id),
                    'customer_phone', (SELECT whatsapp_number FROM customers WHERE id = NEW.customer_id),
                    'order_number', NEW.order_number,
                    'service_name', NEW.service_name,
                    'description', NEW.description,
                    'amount', NEW.amount,
                    'paid_amount', NEW.paid_amount,
                    'payment_type', NEW.payment_type,
                    'status', NEW.status,
                    'priority', NEW.priority,
                    'start_date', NEW.start_date,
                    'due_date', NEW.due_date,
                    'progress', NEW.progress,
                    'estimated_days', EXTRACT(DAY FROM (NEW.due_date - CURRENT_DATE))
                )
            ),
            json_build_object(
                'Content-Type', 'application/json'
            )
        );
    END IF;
    
    -- في حالة إنشاء طلب جديد
    IF TG_OP = 'INSERT' THEN
        -- إرسال إشعار ترحيب وتأكيد الطلب
        PERFORM http_request(
            'POST',
            'https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/send-order-notifications',
            json_build_object(
                'type', 'order_created',
                'order_id', NEW.id,
                'data', json_build_object(
                    'customer_name', (SELECT name FROM customers WHERE id = NEW.customer_id),
                    'customer_phone', (SELECT whatsapp_number FROM customers WHERE id = NEW.customer_id),
                    'order_number', NEW.order_number,
                    'service_name', NEW.service_name,
                    'description', NEW.description,
                    'amount', NEW.amount,
                    'paid_amount', NEW.paid_amount,
                    'payment_type', NEW.payment_type,
                    'status', NEW.status,
                    'priority', NEW.priority,
                    'start_date', NEW.start_date,
                    'due_date', NEW.due_date,
                    'progress', NEW.progress,
                    'estimated_days', EXTRACT(DAY FROM (NEW.due_date - CURRENT_DATE))
                )
            ),
            json_build_object(
                'Content-Type', 'application/json'
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- حذف triggers القديمة وإنشاء trigger جديد
DROP TRIGGER IF EXISTS simple_order_notification_trigger ON orders;
DROP TRIGGER IF EXISTS advanced_order_notification_trigger ON orders;

CREATE TRIGGER order_notification_trigger
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION send_order_notification();