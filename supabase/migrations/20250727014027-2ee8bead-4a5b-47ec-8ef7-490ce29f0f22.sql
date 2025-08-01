-- أولاً: إنشاء دالة لإرسال رسائل الواتساب
CREATE OR REPLACE FUNCTION send_whatsapp_notification(
    customer_id_param UUID,
    template_name_param TEXT,
    order_data JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    customer_record RECORD;
    template_record RECORD;
    message_content TEXT;
    order_items_text TEXT := '';
    evaluation_link TEXT := '';
    webhook_url TEXT;
BEGIN
    -- الحصول على بيانات العميل
    SELECT name, whatsapp_number INTO customer_record
    FROM customers 
    WHERE id = customer_id_param;
    
    -- التحقق من وجود رقم واتساب
    IF customer_record.whatsapp_number IS NULL OR customer_record.whatsapp_number = '' THEN
        RETURN FALSE;
    END IF;
    
    -- الحصول على قالب الرسالة
    SELECT template_content INTO template_record
    FROM message_templates 
    WHERE template_name = template_name_param AND is_active = true;
    
    IF template_record.template_content IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- إعداد محتوى الرسالة
    message_content := template_record.template_content;
    
    -- استبدال المتغيرات الأساسية
    message_content := REPLACE(message_content, '{{customer_name}}', COALESCE(customer_record.name, 'عزيزنا العميل'));
    
    -- إذا كانت هناك بيانات طلب، استبدل متغيرات الطلب
    IF order_data IS NOT NULL THEN
        message_content := REPLACE(message_content, '{{order_number}}', COALESCE(order_data->>'order_number', ''));
        message_content := REPLACE(message_content, '{{service_name}}', COALESCE(order_data->>'service_name', ''));
        message_content := REPLACE(message_content, '{{description}}', COALESCE(order_data->>'description', ''));
        message_content := REPLACE(message_content, '{{amount}}', COALESCE(order_data->>'amount', ''));
        message_content := REPLACE(message_content, '{{paid_amount}}', COALESCE(order_data->>'paid_amount', '0'));
        message_content := REPLACE(message_content, '{{remaining_amount}}', 
            COALESCE((COALESCE((order_data->>'amount')::NUMERIC, 0) - COALESCE((order_data->>'paid_amount')::NUMERIC, 0))::TEXT, '0'));
        message_content := REPLACE(message_content, '{{payment_type}}', COALESCE(order_data->>'payment_type', ''));
        message_content := REPLACE(message_content, '{{status}}', COALESCE(order_data->>'status', ''));
        message_content := REPLACE(message_content, '{{priority}}', COALESCE(order_data->>'priority', ''));
        message_content := REPLACE(message_content, '{{start_date}}', COALESCE(order_data->>'start_date', ''));
        message_content := REPLACE(message_content, '{{due_date}}', COALESCE(order_data->>'due_date', ''));
        
        -- إعداد قائمة بنود الطلب
        IF order_data ? 'order_items' THEN
            SELECT STRING_AGG(
                '• ' || oi.item_name || ' - الكمية: ' || oi.quantity || ' - السعر: ' || oi.unit_price || ' ر.س',
                E'\n'
            ) INTO order_items_text
            FROM order_items oi
            WHERE oi.order_id = (order_data->>'order_id')::UUID;
            
            message_content := REPLACE(message_content, '{{order_items}}', COALESCE(order_items_text, 'لا توجد بنود'));
            
            -- عدد البنود
            message_content := REPLACE(message_content, '{{order_items_count}}', 
                COALESCE((SELECT COUNT(*)::TEXT FROM order_items WHERE order_id = (order_data->>'order_id')::UUID), '0'));
            
            -- إجمالي البنود
            message_content := REPLACE(message_content, '{{order_items_total}}', 
                COALESCE((SELECT SUM(total_amount)::TEXT FROM order_items WHERE order_id = (order_data->>'order_id')::UUID), '0'));
        END IF;
        
        -- إعداد رابط التقييم
        IF template_name_param IN ('order_completed', 'order_ready_for_delivery') THEN
            evaluation_link := 'https://your-domain.com/evaluation?order=' || (order_data->>'order_id');
            message_content := REPLACE(message_content, '{{evaluation_link}}', evaluation_link);
        END IF;
    END IF;
    
    -- إضافة التاريخ الحالي
    message_content := REPLACE(message_content, '{{date}}', TO_CHAR(NOW(), 'DD/MM/YYYY'));
    message_content := REPLACE(message_content, '{{company_name}}', 'شركتنا');
    
    -- الحصول على webhook للإرسال
    SELECT webhook_url INTO webhook_url
    FROM webhook_settings 
    WHERE webhook_type = 'outgoing' AND is_active = true
    LIMIT 1;
    
    IF webhook_url IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- إرسال الرسالة عبر دالة الإرسال
    PERFORM extensions.http_post(
        url := webhook_url,
        body := jsonb_build_object(
            'to', customer_record.whatsapp_number,
            'type', 'text',
            'message', jsonb_build_object('text', message_content),
            'timestamp', EXTRACT(EPOCH FROM NOW())
        )::text,
        headers := '{"Content-Type": "application/json"}'::jsonb
    );
    
    -- حفظ الرسالة في قاعدة البيانات
    INSERT INTO whatsapp_messages (
        from_number, 
        to_number, 
        message_type, 
        message_content, 
        status, 
        customer_id
    ) VALUES (
        'system',
        customer_record.whatsapp_number,
        'text',
        message_content,
        'sent',
        customer_id_param
    );
    
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        -- في حالة حدوث خطأ، سجل الرسالة كفاشلة
        INSERT INTO whatsapp_messages (
            from_number, 
            to_number, 
            message_type, 
            message_content, 
            status, 
            customer_id
        ) VALUES (
            'system',
            COALESCE(customer_record.whatsapp_number, 'unknown'),
            'text',
            COALESCE(message_content, 'خطأ في إرسال الرسالة'),
            'failed',
            customer_id_param
        );
        
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث دالة إشعارات الطلبات لتشمل الواتساب
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- استبدال trigger الطلبات القديم بالجديد
DROP TRIGGER IF EXISTS simple_order_notification_trigger ON orders;
CREATE TRIGGER advanced_order_notification_trigger
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION advanced_order_notification();