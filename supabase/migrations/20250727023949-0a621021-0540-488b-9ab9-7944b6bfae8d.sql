-- إصلاح دالة advanced_order_notification لتعمل بدون net.http_post
-- سنعود للطريقة القديمة المجربة مع تحسينات

CREATE OR REPLACE FUNCTION public.advanced_order_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    customer_record RECORD;
    template_name TEXT;
    order_data JSONB;
    message_content TEXT;
    order_items_text TEXT := '';
    evaluation_link TEXT := '';
    remaining_amount NUMERIC;
BEGIN
    -- في حالة تحديث حالة الطلب
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        
        -- الحصول على بيانات العميل
        SELECT name, whatsapp_number INTO customer_record
        FROM customers 
        WHERE id = NEW.customer_id;
        
        -- التحقق من وجود رقم واتساب
        IF customer_record.whatsapp_number IS NULL OR customer_record.whatsapp_number = '' THEN
            -- إرسال إشعار للنظام فقط
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
            RETURN NEW;
        END IF;
        
        -- تحديد قالب الرسالة حسب الحالة
        CASE NEW.status
            WHEN 'مؤكد' THEN
                template_name := 'order_confirmed';
            WHEN 'قيد التنفيذ' THEN
                template_name := 'order_in_progress';
            WHEN 'قيد المراجعة' THEN
                template_name := 'order_under_review';
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
        IF template_name IS NOT NULL THEN
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
            
            -- استدعاء دالة إرسال الواتساب المحدثة
            PERFORM send_whatsapp_notification_improved(NEW.customer_id, template_name, order_data);
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
        
        -- الحصول على بيانات العميل
        SELECT name, whatsapp_number INTO customer_record
        FROM customers 
        WHERE id = NEW.customer_id;
        
        -- التحقق من وجود رقم واتساب
        IF customer_record.whatsapp_number IS NOT NULL AND customer_record.whatsapp_number != '' THEN
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
            PERFORM send_whatsapp_notification_improved(NEW.customer_id, 'order_created', order_data);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- إنشاء دالة محسنة لإرسال رسائل الواتساب
CREATE OR REPLACE FUNCTION public.send_whatsapp_notification_improved(customer_id_param uuid, template_name_param text, order_data jsonb DEFAULT NULL::jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    customer_record RECORD;
    template_record RECORD;
    message_content TEXT;
    order_items_text TEXT := '';
    evaluation_link TEXT := '';
    start_date_text TEXT := 'سيتم تحديده';
    due_date_text TEXT := 'سيتم تحديده';
    remaining_amount TEXT := '0';
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
    
    -- إذا كانت هناك بيانات طلب، قم بمعالجتها
    IF order_data IS NOT NULL THEN
        -- جلب بنود الطلب
        SELECT STRING_AGG(
            '• ' || oi.item_name || ' - الكمية: ' || oi.quantity || ' - السعر: ' || oi.unit_price || ' ر.س',
            E'\n'
        ) INTO order_items_text
        FROM order_items oi
        WHERE oi.order_id = (order_data->>'order_id')::UUID;
        
        -- حساب المبلغ المتبقي
        remaining_amount := (
            COALESCE((order_data->>'amount')::NUMERIC, 0) - 
            COALESCE((order_data->>'paid_amount')::NUMERIC, 0)
        )::TEXT;
        
        -- تنسيق التواريخ
        IF order_data->>'start_date' IS NOT NULL AND order_data->>'start_date' != '' THEN
            start_date_text := TO_CHAR((order_data->>'start_date')::DATE, 'DD/MM/YYYY');
        END IF;
        
        IF order_data->>'due_date' IS NOT NULL AND order_data->>'due_date' != '' THEN
            due_date_text := TO_CHAR((order_data->>'due_date')::DATE, 'DD/MM/YYYY');
        END IF;
        
        -- إعداد رابط التقييم للطلبات المكتملة أو الجاهزة للتسليم
        IF template_name_param IN ('order_completed', 'order_ready_for_delivery') THEN
            evaluation_link := 'https://e5a7747a-0935-46df-9ea9-1308e76636dc.lovableproject.com/evaluation/token-' || (order_data->>'order_id');
        END IF;
        
        -- استبدال المتغيرات في الرسالة
        message_content := REPLACE(message_content, '{{customer_name}}', COALESCE(customer_record.name, 'عزيزنا العميل'));
        message_content := REPLACE(message_content, '{{order_number}}', COALESCE(order_data->>'order_number', ''));
        message_content := REPLACE(message_content, '{{service_name}}', COALESCE(order_data->>'service_name', ''));
        message_content := REPLACE(message_content, '{{description}}', COALESCE(order_data->>'description', 'غير محدد'));
        message_content := REPLACE(message_content, '{{amount}}', COALESCE(order_data->>'amount', '0'));
        message_content := REPLACE(message_content, '{{paid_amount}}', COALESCE(order_data->>'paid_amount', '0'));
        message_content := REPLACE(message_content, '{{remaining_amount}}', remaining_amount);
        message_content := REPLACE(message_content, '{{payment_type}}', COALESCE(order_data->>'payment_type', 'غير محدد'));
        message_content := REPLACE(message_content, '{{status}}', COALESCE(order_data->>'status', ''));
        message_content := REPLACE(message_content, '{{priority}}', COALESCE(order_data->>'priority', 'متوسطة'));
        message_content := REPLACE(message_content, '{{start_date}}', start_date_text);
        message_content := REPLACE(message_content, '{{due_date}}', due_date_text);
        message_content := REPLACE(message_content, '{{order_items}}', COALESCE(order_items_text, 'لا توجد بنود محددة'));
        message_content := REPLACE(message_content, '{{evaluation_link}}', evaluation_link);
    ELSE
        -- استبدال المتغيرات الأساسية فقط
        message_content := REPLACE(message_content, '{{customer_name}}', COALESCE(customer_record.name, 'عزيزنا العميل'));
    END IF;
    
    -- إضافة التاريخ الحالي واسم الشركة
    message_content := REPLACE(message_content, '{{date}}', TO_CHAR(NOW(), 'DD/MM/YYYY'));
    message_content := REPLACE(message_content, '{{company_name}}', 'وكالة الإبداع للدعاية والإعلان');
    
    -- حفظ الرسالة في قاعدة البيانات مع حالة "pending" للإرسال لاحقاً
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
        'pending',
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
            customer_id,
            created_at
        ) VALUES (
            'system',
            COALESCE(customer_record.whatsapp_number, 'unknown'),
            'text',
            COALESCE(message_content, 'خطأ في إرسال الرسالة: ' || SQLERRM),
            'failed',
            customer_id_param,
            NOW()
        );
        
        RETURN FALSE;
END;
$function$;