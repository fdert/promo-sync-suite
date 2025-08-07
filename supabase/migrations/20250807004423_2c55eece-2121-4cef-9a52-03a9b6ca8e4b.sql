-- تحديث دالة إرسال التقييم لتكون فورية
CREATE OR REPLACE FUNCTION public.send_evaluation_link_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    customer_record RECORD;
    google_settings RECORD;
    review_link TEXT;
    evaluation_id UUID;
BEGIN
    -- التحقق من تغيير الحالة إلى "مكتمل"
    IF NEW.status = 'مكتمل' AND (OLD.status IS NULL OR OLD.status != 'مكتمل') THEN
        
        RAISE LOG 'تم تغيير حالة الطلب % إلى مكتمل', NEW.order_number;
        
        -- جلب بيانات العميل
        SELECT name, whatsapp_number INTO customer_record
        FROM customers 
        WHERE id = NEW.customer_id;
        
        RAISE LOG 'معلومات العميل: الاسم=%, الواتساب=%', customer_record.name, customer_record.whatsapp_number;
        
        -- إرسال رسالة واتساب فورية إذا كان رقم الواتساب متوفر
        IF customer_record.whatsapp_number IS NOT NULL AND customer_record.whatsapp_number != '' THEN
            -- استدعاء edge function للإرسال الفوري باستخدام pg_notify
            PERFORM pg_notify('send_google_review_immediate', 
                jsonb_build_object(
                    'order_id', NEW.id,
                    'order_number', NEW.order_number,
                    'customer_name', customer_record.name,
                    'customer_phone', customer_record.whatsapp_number
                )::text
            );
            
            RAISE LOG 'تم إرسال إشعار فوري لإرسال رسالة التقييم للطلب: %', NEW.order_number;
        ELSE
            RAISE LOG 'لا يوجد رقم واتساب للعميل: %', customer_record.name;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;