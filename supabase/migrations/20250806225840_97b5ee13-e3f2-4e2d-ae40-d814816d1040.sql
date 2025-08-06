-- إصلاح مشكلة قيد فحص التقييم في جدول evaluations
ALTER TABLE evaluations ALTER COLUMN rating DROP NOT NULL;

-- تحديث دالة إرسال رابط التقييم لحل مشكلة قيد الفحص
CREATE OR REPLACE FUNCTION send_evaluation_link_on_completion()
RETURNS TRIGGER AS $$
DECLARE
    customer_record RECORD;
    evaluation_token TEXT;
    evaluation_link TEXT;
    message_content TEXT;
BEGIN
    -- التحقق من تغيير الحالة إلى "مكتمل"
    IF NEW.status = 'مكتمل' AND (OLD.status IS NULL OR OLD.status != 'مكتمل') THEN
        
        -- جلب بيانات العميل
        SELECT name, whatsapp_number INTO customer_record
        FROM customers 
        WHERE id = NEW.customer_id;
        
        -- التحقق من وجود رقم واتساب
        IF customer_record.whatsapp_number IS NOT NULL AND customer_record.whatsapp_number != '' THEN
            
            -- إنشاء رمز تقييم فريد
            evaluation_token := 'eval_' || NEW.id || '_' || extract(epoch from now())::text;
            
            -- إنشاء رابط التقييم
            evaluation_link := 'https://e5a7747a-0935-46df-9ea9-1308e76636dc.lovableproject.com/evaluation/' || evaluation_token;
            
            -- التحقق من عدم وجود تقييم مسبق لهذا الطلب
            IF NOT EXISTS (SELECT 1 FROM evaluations WHERE order_id = NEW.id) THEN
                
                -- إدراج سجل تقييم جديد بدون rating (سيكون NULL)
                INSERT INTO evaluations (
                    order_id,
                    customer_id,
                    evaluation_token,
                    created_at,
                    google_review_status,
                    is_public
                ) VALUES (
                    NEW.id,
                    NEW.customer_id,
                    evaluation_token,
                    NOW(),
                    'pending',
                    false
                );
                
                -- إعداد محتوى الرسالة
                message_content := 'مرحباً ' || COALESCE(customer_record.name, 'عزيزنا العميل') || 
                                 E'\n\nتم إكمال طلبكم رقم: ' || NEW.order_number ||
                                 E'\n\nنرجو منكم تقييم الخدمة من خلال الرابط التالي:' ||
                                 E'\n' || evaluation_link ||
                                 E'\n\nشكراً لثقتكم بنا 🙏';
                
                -- إدراج رسالة واتساب للإرسال
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
                    customer_record.whatsapp_number,
                    'text',
                    message_content,
                    'pending',
                    NEW.customer_id,
                    NOW()
                );
                
                RAISE LOG 'تم إنشاء رابط تقييم وإضافة رسالة واتساب للطلب: %', NEW.order_number;
                
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- إصلاح دالة advanced_order_notification لحل مشكلة paid_amount
CREATE OR REPLACE FUNCTION public.advanced_order_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
            -- إعداد بيانات الطلب (بدون paid_amount المفقود)
            order_data := jsonb_build_object(
                'order_id', NEW.id,
                'order_number', NEW.order_number,
                'service_name', NEW.service_name,
                'description', NEW.description,
                'amount', NEW.amount,
                'payment_type', NEW.payment_type,
                'status', NEW.status,
                'priority', NEW.priority,
                'start_date', NEW.start_date,
                'due_date', NEW.due_date,
                'order_items', true
            );
            
            -- استدعاء دالة إرسال الواتساب
            PERFORM send_whatsapp_notification_improved(NEW.customer_id, template_name, order_data);
        END IF;
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
$$;