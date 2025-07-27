-- تحديث الدالة الأخرى لإضافة search_path الآمن
CREATE OR REPLACE FUNCTION advanced_order_notification()
RETURNS TRIGGER AS $$
DECLARE
    order_data JSONB;
    template_name TEXT;
BEGIN
    -- في حالة تحديث حالة الطلب
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        
        -- إعداد بيانات الطلب
        order_data := jsonb_build_object(
            'order_id', NEW.id,
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
            'order_items', true
        );
        
        -- تحديد قالب الرسالة حسب الحالة
        CASE NEW.status
            WHEN 'مؤكد' THEN
                template_name := 'order_confirmed';
            WHEN 'قيد التنفيذ' THEN
                template_name := 'order_in_progress';
            WHEN 'جاهز للتسليم' THEN
                template_name := 'order_ready_for_delivery';
            WHEN 'مكتمل' THEN
                template_name := 'order_completed';
            WHEN 'ملغي' THEN
                template_name := 'order_cancelled';
            ELSE
                template_name := NULL;
        END CASE;
        
        -- إرسال رسالة واتساب إذا كان هناك قالب مناسب
        IF template_name IS NOT NULL AND NEW.customer_id IS NOT NULL THEN
            PERFORM send_whatsapp_notification(NEW.customer_id, template_name, order_data);
        END IF;
        
        -- إرسال إشعار عادي للنظام
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type
        ) VALUES (
            NEW.created_by,
            'تحديث حالة الطلب',
            'تم تحديث حالة الطلب ' || NEW.order_number || ' إلى: ' || NEW.status,
            'info'
        );
    END IF;
    
    -- في حالة إنشاء طلب جديد
    IF TG_OP = 'INSERT' THEN
        -- إعداد بيانات الطلب
        order_data := jsonb_build_object(
            'order_id', NEW.id,
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
            'order_items', true
        );
        
        -- إرسال رسالة ترحيب وتأكيد الطلب
        IF NEW.customer_id IS NOT NULL THEN
            PERFORM send_whatsapp_notification(NEW.customer_id, 'order_created', order_data);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- إنشاء دالة لمعالجة الرسائل المعلقة تلقائياً
CREATE OR REPLACE FUNCTION process_pending_whatsapp_messages()
RETURNS void AS $$
DECLARE
    pending_count INTEGER;
BEGIN
    -- التحقق من وجود رسائل معلقة
    SELECT COUNT(*) INTO pending_count
    FROM whatsapp_messages 
    WHERE status = 'pending';
    
    -- إذا كان هناك رسائل معلقة، استدعي edge function لمعالجتها
    IF pending_count > 0 THEN
        -- يمكن استدعاء edge function هنا أو تحديث الحالة مؤقتاً
        PERFORM pg_notify('process_whatsapp', pending_count::text);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;