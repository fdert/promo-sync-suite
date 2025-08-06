-- إنشاء دالة لإرسال رابط التقييم عند إكمال الطلب
CREATE OR REPLACE FUNCTION public.send_evaluation_link_on_completion()
RETURNS TRIGGER AS $$
DECLARE
    evaluation_token TEXT;
    evaluation_link TEXT;
    customer_record RECORD;
    message_content TEXT;
BEGIN
    -- التحقق من أن الحالة تغيرت إلى "مكتمل"
    IF NEW.status = 'مكتمل' AND (OLD.status IS NULL OR OLD.status != 'مكتمل') THEN
        
        -- جلب بيانات العميل
        SELECT name, whatsapp_number INTO customer_record
        FROM customers 
        WHERE id = NEW.customer_id;
        
        -- التحقق من وجود رقم واتساب
        IF customer_record.whatsapp_number IS NOT NULL AND customer_record.whatsapp_number != '' THEN
            
            -- إنشاء رمز التقييم
            evaluation_token := 'eval-' || NEW.id || '-' || extract(epoch from now())::bigint;
            
            -- إنشاء رابط التقييم
            evaluation_link := 'https://e5a7747a-0935-46df-9ea9-1308e76636dc.lovableproject.com/evaluation?token=' || evaluation_token;
            
            -- إنشاء سجل التقييم
            INSERT INTO evaluations (
                order_id,
                customer_id,
                evaluation_token,
                rating,
                submitted_at,
                is_public,
                google_review_status
            ) VALUES (
                NEW.id,
                NEW.customer_id,
                evaluation_token,
                0, -- سيتم تحديثه عند تقديم التقييم
                NULL, -- لم يتم التقديم بعد
                false,
                'pending'
            );
            
            -- إعداد رسالة الواتساب
            message_content := 'عزيزنا العميل ' || customer_record.name || E'\n\n' ||
                             'تم إكمال طلبكم رقم: ' || NEW.order_number || E'\n' ||
                             'نرجو منكم تقييم تجربتكم معنا من خلال الرابط التالي:' || E'\n\n' ||
                             evaluation_link || E'\n\n' ||
                             'شكراً لثقتكم بنا!' || E'\n' ||
                             'وكالة الإبداع للدعاية والإعلان';
            
            -- إرسال رسالة الواتساب
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
                NEW.customer_id
            );
            
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء الـ trigger
DROP TRIGGER IF EXISTS send_evaluation_link_trigger ON orders;
CREATE TRIGGER send_evaluation_link_trigger
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION send_evaluation_link_on_completion();