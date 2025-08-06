-- حذف الـ triggers القديمة وإنشاء trigger جديد للتقييمات مع رابط جوجل

-- حذف جميع triggers المتعلقة بإرسال التقييمات
DROP TRIGGER IF EXISTS send_evaluation_link_trigger ON orders;
DROP TRIGGER IF EXISTS order_status_change_trigger ON orders;
DROP TRIGGER IF EXISTS advanced_order_notification_trigger ON orders;

-- إنشاء trigger جديد للتقييمات مع رابط جوجل
CREATE TRIGGER send_google_review_trigger
    AFTER UPDATE OF status ON orders
    FOR EACH ROW
    WHEN (NEW.status = 'مكتمل' AND (OLD.status IS NULL OR OLD.status != 'مكتمل'))
    EXECUTE FUNCTION send_evaluation_link_on_completion();

-- تحديث الدالة لتعمل بشكل صحيح
CREATE OR REPLACE FUNCTION public.send_evaluation_link_on_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
    customer_record RECORD;
    evaluation_token TEXT;
    google_settings RECORD;
    review_link TEXT;
    place_id_clean TEXT;
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
        
        -- التحقق من عدم وجود تقييم مسبق لهذا الطلب
        SELECT id INTO evaluation_id FROM evaluations WHERE order_id = NEW.id LIMIT 1;
        
        IF evaluation_id IS NULL THEN
            -- إنشاء رمز تقييم فريد
            evaluation_token := 'token-' || NEW.id;
            
            -- إدراج سجل تقييم جديد
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
            ) RETURNING id INTO evaluation_id;
            
            RAISE LOG 'تم إنشاء تقييم جديد برمز: % والمعرف: %', evaluation_token, evaluation_id;
        ELSE
            RAISE LOG 'يوجد تقييم مسبق بالمعرف: %', evaluation_id;
            -- استخدام التقييم الموجود
            SELECT evaluation_token INTO evaluation_token FROM evaluations WHERE id = evaluation_id;
        END IF;
        
        -- جلب إعدادات خرائط جوجل
        SELECT * INTO google_settings
        FROM google_maps_settings
        LIMIT 1;
        
        -- إنشاء رابط التقييم إذا كانت الإعدادات متوفرة
        IF google_settings.place_id IS NOT NULL THEN
            -- استخراج place_id الصحيح
            place_id_clean := google_settings.place_id;
            review_link := 'https://search.google.com/local/writereview?placeid=' || place_id_clean;
            
            RAISE LOG 'تم إنشاء رابط التقييم: %', review_link;
            
            -- إرسال رسالة واتساب تلقائية مع رابط جوجل إذا كان رقم الواتساب متوفر
            IF customer_record.whatsapp_number IS NOT NULL AND customer_record.whatsapp_number != '' THEN
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
                    'مرحباً ' || COALESCE(customer_record.name, 'عزيزنا العميل') || '! 🎉' || E'\n\n' ||
                    '✅ طلبك رقم: ' || NEW.order_number || ' تم إكماله بنجاح!' || E'\n\n' ||
                    '🌟 نرجو منك تقييم تجربتك معنا على خرائط جوجل:' || E'\n' ||
                    review_link || E'\n\n' ||
                    'تقييمك مهم جداً لنا ويساعدنا على تحسين خدماتنا.' || E'\n\n' ||
                    'شكراً لاختيارك خدماتنا! 🙏',
                    'pending',
                    NEW.customer_id,
                    NOW()
                );
                
                RAISE LOG 'تم إنشاء رسالة واتساب جوجل للعميل: % برقم: %', customer_record.name, customer_record.whatsapp_number;
            ELSE
                RAISE LOG 'لا يوجد رقم واتساب للعميل: %', customer_record.name;
            END IF;
        ELSE
            RAISE LOG 'لا توجد إعدادات خرائط جوجل محفوظة';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;