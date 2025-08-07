-- إصلاح دالة إنشاء التقييم عند اكتمال الطلب
CREATE OR REPLACE FUNCTION public.create_evaluation_on_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    customer_record RECORD;
    evaluation_token TEXT;
    evaluation_id UUID;
BEGIN
    -- التحقق من تغيير الحالة إلى "مكتمل"
    IF NEW.status = 'مكتمل' AND (OLD.status IS NULL OR OLD.status != 'مكتمل') THEN
        
        RAISE LOG 'إنشاء تقييم للطلب: %', NEW.order_number;
        
        -- إنشاء token فريد للتقييم
        evaluation_token := 'token-' || NEW.id;
        
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
            ) RETURNING id INTO evaluation_id;
            
            RAISE LOG 'تم إنشاء تقييم بنجاح للطلب: %', NEW.order_number;
        ELSE
            RAISE LOG 'التقييم موجود مسبقاً للطلب: %', NEW.order_number;
            -- الحصول على معرف التقييم الموجود
            SELECT id INTO evaluation_id FROM evaluations WHERE order_id = NEW.id LIMIT 1;
        END IF;
        
        -- جلب بيانات العميل
        SELECT name, whatsapp_number INTO customer_record
        FROM customers 
        WHERE id = NEW.customer_id;
        
        -- التحقق من وجود رقم واتساب وإرسال الرسالة
        IF customer_record.whatsapp_number IS NOT NULL AND customer_record.whatsapp_number != '' THEN
            RAISE LOG 'إرسال رسالة تقييم للعميل: %', customer_record.name;
            
            -- استدعاء edge function لإرسال رسالة التقييم
            PERFORM net.http_post(
                url := 'https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/send-google-review-immediately',
                headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
                body := json_build_object(
                    'orderId', NEW.id
                )::jsonb
            );
            
            RAISE LOG 'تم استدعاء edge function بنجاح';
        ELSE
            RAISE LOG 'لا يوجد رقم واتساب للعميل: %', customer_record.name;
        END IF;
    END IF;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'خطأ في إنشاء التقييم: %', SQLERRM;
        RETURN NEW;
END;
$function$;