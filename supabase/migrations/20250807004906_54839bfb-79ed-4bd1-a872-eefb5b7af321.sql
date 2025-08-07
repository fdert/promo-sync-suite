-- إصلاح دالة إرسال التقييم النهائي
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
    message_content TEXT;
BEGIN
    -- التحقق من تغيير الحالة إلى "مكتمل"
    IF NEW.status = 'مكتمل' AND (OLD.status IS NULL OR OLD.status != 'مكتمل') THEN
        
        RAISE LOG 'تم تغيير حالة الطلب % إلى مكتمل', NEW.order_number;
        
        -- جلب بيانات العميل
        SELECT name, whatsapp_number INTO customer_record
        FROM customers 
        WHERE id = NEW.customer_id;
        
        RAISE LOG 'معلومات العميل: الاسم=%, الواتساب=%', customer_record.name, customer_record.whatsapp_number;
        
        -- التحقق من وجود رقم واتساب
        IF customer_record.whatsapp_number IS NOT NULL AND customer_record.whatsapp_number != '' THEN
            
            -- جلب إعدادات جوجل
            SELECT * INTO google_settings
            FROM google_maps_settings
            LIMIT 1;
            
            -- إنشاء رابط التقييم
            IF google_settings.place_id IS NOT NULL THEN
                review_link := 'https://search.google.com/local/writereview?placeid=' || google_settings.place_id;
                RAISE LOG 'تم إنشاء رابط التقييم: %', review_link;
                
                -- إنشاء محتوى رسالة التقييم
                message_content := 'مرحباً ' || COALESCE(customer_record.name, 'عزيزنا العميل') || '! 🎉' || E'\n\n' ||
                    '✅ طلبك رقم: ' || NEW.order_number || ' تم إكماله بنجاح!' || E'\n\n' ||
                    '🌟 نرجو منك تقييم تجربتك معنا على خرائط جوجل:' || E'\n' ||
                    review_link || E'\n\n' ||
                    'تقييمك مهم جداً لنا ويساعدنا على تحسين خدماتنا.' || E'\n\n' ||
                    'شكراً لاختيارك خدماتنا! 🙏';
                
                -- حفظ الرسالة مع حالة pending للمعالجة الفورية
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
                
                RAISE LOG 'تم إنشاء رسالة واتساب جوجل للعميل: % برقم: %', customer_record.name, customer_record.whatsapp_number;
                
                -- استدعاء معالج الرسائل المعلقة فوراً
                PERFORM net.http_post(
                    url := 'https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/send-pending-whatsapp',
                    headers := '{"Content-Type": "application/json"}'::jsonb,
                    body := '{}'::jsonb
                );
                
                RAISE LOG 'تم استدعاء معالج الرسائل المعلقة';
                
            ELSE
                RAISE LOG 'لا توجد إعدادات خرائط جوجل محفوظة';
            END IF;
        ELSE
            RAISE LOG 'لا يوجد رقم واتساب للعميل: %', customer_record.name;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;