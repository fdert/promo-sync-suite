-- تحديث دالة advanced_order_notification لتستدعي Edge Function مباشرة
CREATE OR REPLACE FUNCTION public.advanced_order_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    customer_record RECORD;
    webhook_payload JSONB;
BEGIN
    -- في حالة تحديث حالة الطلب
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        
        -- الحصول على بيانات العميل
        SELECT name, whatsapp_number INTO customer_record
        FROM customers 
        WHERE id = NEW.customer_id;
        
        -- إعداد payload لإرسال إلى Edge Function
        webhook_payload := jsonb_build_object(
            'type', CASE NEW.status
                WHEN 'مؤكد' THEN 'order_confirmed'
                WHEN 'قيد التنفيذ' THEN 'order_in_progress'
                WHEN 'قيد المراجعة' THEN 'order_under_review'
                WHEN 'جاهز للتسليم' THEN 'order_ready_for_delivery'
                WHEN 'مكتمل' THEN 'order_completed'
                WHEN 'ملغي' THEN 'order_cancelled'
                ELSE 'order_updated'
            END,
            'order_id', NEW.id,
            'data', jsonb_build_object(
                'order_number', NEW.order_number,
                'customer_name', COALESCE(customer_record.name, 'عزيزنا العميل'),
                'customer_phone', COALESCE(customer_record.whatsapp_number, ''),
                'amount', NEW.amount,
                'progress', NEW.progress,
                'service_name', NEW.service_name,
                'description', COALESCE(NEW.description, ''),
                'payment_type', NEW.payment_type,
                'paid_amount', NEW.paid_amount,
                'status', NEW.status,
                'priority', NEW.priority,
                'due_date', COALESCE(NEW.due_date::text, ''),
                'start_date', COALESCE(NEW.start_date::text, '')
            )
        );
        
        -- استدعاء Edge Function لإرسال إشعار WhatsApp إذا كان العميل لديه رقم واتساب
        IF customer_record.whatsapp_number IS NOT NULL AND customer_record.whatsapp_number != '' THEN
            PERFORM
                net.http_post(
                    url := 'https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/send-order-notifications',
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdXFmeGFjbmJ4ZGxkc2JtZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0Nzg1MjQsImV4cCI6MjA2OTA1NDUyNH0.jzfLlevMRqw85cwBrTnGRRvut-3g9M1yRiXQB2pw-mc'
                    ),
                    body := webhook_payload::text
                );
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
        
        -- إعداد payload لإرسال إلى Edge Function
        webhook_payload := jsonb_build_object(
            'type', 'order_created',
            'order_id', NEW.id,
            'data', jsonb_build_object(
                'order_number', NEW.order_number,
                'customer_name', COALESCE(customer_record.name, 'عزيزنا العميل'),
                'customer_phone', COALESCE(customer_record.whatsapp_number, ''),
                'amount', NEW.amount,
                'progress', NEW.progress,
                'service_name', NEW.service_name,
                'description', COALESCE(NEW.description, ''),
                'payment_type', NEW.payment_type,
                'paid_amount', NEW.paid_amount,
                'status', NEW.status,
                'priority', NEW.priority,
                'due_date', COALESCE(NEW.due_date::text, ''),
                'start_date', COALESCE(NEW.start_date::text, '')
            )
        );
        
        -- استدعاء Edge Function لإرسال رسالة ترحيب وتأكيد الطلب
        IF customer_record.whatsapp_number IS NOT NULL AND customer_record.whatsapp_number != '' THEN
            PERFORM
                net.http_post(
                    url := 'https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/send-order-notifications',
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdXFmeGFjbmJ4ZGxkc2JtZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0Nzg1MjQsImV4cCI6MjA2OTA1NDUyNH0.jzfLlevMRqw85cwBrTnGRRvut-3g9M1yRiXQB2pw-mc'
                    ),
                    body := webhook_payload::text
                );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;