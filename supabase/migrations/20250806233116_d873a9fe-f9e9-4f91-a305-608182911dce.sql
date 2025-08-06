-- تعديل دالة إرسال رابط التقييم لتقوم بإنشاء التقييم فقط بدون إرسال رسائل واتساب
CREATE OR REPLACE FUNCTION public.send_evaluation_link_on_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    customer_record RECORD;
    evaluation_token TEXT;
BEGIN
    -- التحقق من تغيير الحالة إلى "مكتمل"
    IF NEW.status = 'مكتمل' AND (OLD.status IS NULL OR OLD.status != 'مكتمل') THEN
        
        -- جلب بيانات العميل
        SELECT name, whatsapp_number INTO customer_record
        FROM customers 
        WHERE id = NEW.customer_id;
        
        -- التحقق من عدم وجود تقييم مسبق لهذا الطلب
        IF NOT EXISTS (SELECT 1 FROM evaluations WHERE order_id = NEW.id) THEN
            
            -- إنشاء رمز تقييم فريد
            evaluation_token := 'eval_' || NEW.id || '_' || extract(epoch from now())::text;
            
            -- إدراج سجل تقييم جديد بدون rating (NULL) وبدون إرسال رسائل
            INSERT INTO evaluations (
                order_id,
                customer_id,
                evaluation_token,
                created_at
            ) VALUES (
                NEW.id,
                NEW.customer_id,
                evaluation_token,
                NOW()
            );
            
            RAISE LOG 'تم إنشاء تقييم للطلب: % بدون إرسال رسائل واتساب', NEW.order_number;
            
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$