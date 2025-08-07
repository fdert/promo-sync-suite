-- إصلاح الدالة لتعمل مع edge functions بدلاً من HTTP مباشر
CREATE OR REPLACE FUNCTION public.create_evaluation_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    customer_record RECORD;
    evaluation_token TEXT;
BEGIN
    -- التحقق من تغيير الحالة إلى "مكتمل"
    IF NEW.status = 'مكتمل' AND (OLD.status IS NULL OR OLD.status != 'مكتمل') THEN
        
        RAISE LOG 'إنشاء تقييم للطلب: %', NEW.order_number;
        
        -- إنشاء token فريد للتقييم
        evaluation_token := 'eval_' || NEW.id || '_' || extract(epoch from now());
        
        -- التحقق من عدم وجود تقييم مسبق لهذا الطلب
        IF NOT EXISTS (SELECT 1 FROM evaluations WHERE order_id = NEW.id) THEN
            INSERT INTO evaluations (
                order_id,
                customer_id,
                evaluation_token,
                google_review_status,
                created_at,
                updated_at
            ) VALUES (
                NEW.id,
                NEW.customer_id,
                evaluation_token,
                'pending',
                NOW(),
                NOW()
            );
            
            RAISE LOG 'تم إنشاء تقييم للطلب بنجاح مع token: %', evaluation_token;
        ELSE
            RAISE LOG 'التقييم موجود مسبقاً للطلب: %', NEW.order_number;
            RETURN NEW;
        END IF;
        
        -- جلب بيانات العميل
        SELECT name, whatsapp_number INTO customer_record
        FROM customers 
        WHERE id = NEW.customer_id;
        
        -- التحقق من وجود رقم واتساب
        IF customer_record.whatsapp_number IS NOT NULL AND customer_record.whatsapp_number != '' THEN
            RAISE LOG 'سيتم إرسال رسالة التقييم للعميل: % على الرقم: %', customer_record.name, customer_record.whatsapp_number;
            
            -- استدعاء edge function لإرسال رسالة التقييم
            PERFORM net.http_post(
                url := 'https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/send-evaluation-request',
                headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('supabase.service_role_key', true) || '"}'::jsonb,
                body := jsonb_build_object(
                    'orderId', NEW.id,
                    'customerId', NEW.customer_id,
                    'evaluationToken', evaluation_token,
                    'orderNumber', NEW.order_number,
                    'serviceName', NEW.service_name,
                    'customerName', customer_record.name,
                    'whatsappNumber', customer_record.whatsapp_number
                )
            );
            
            RAISE LOG 'تم استدعاء edge function لإرسال رسالة التقييم';
        ELSE
            RAISE LOG 'لا يوجد رقم واتساب للعميل';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;