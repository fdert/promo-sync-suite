-- إنشاء دالة لإرسال رابط التقييم عند اكتمال الطلب
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
                
                -- إدراج سجل تقييم جديد
                INSERT INTO evaluations (
                    order_id,
                    customer_id,
                    evaluation_token,
                    rating,
                    created_at
                ) VALUES (
                    NEW.id,
                    NEW.customer_id,
                    evaluation_token,
                    0, -- سيتم تحديثه لاحقاً بواسطة العميل
                    NOW()
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء المحفز (Trigger)
DROP TRIGGER IF EXISTS send_evaluation_link_trigger ON orders;

CREATE TRIGGER send_evaluation_link_trigger
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION send_evaluation_link_on_completion();