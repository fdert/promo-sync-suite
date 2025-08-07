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
    message_content TEXT;
    evaluation_webhook_url TEXT;
    payload JSONB;
BEGIN
    -- التحقق من تغيير الحالة إلى "مكتمل"
    IF NEW.status = 'مكتمل' AND (OLD.status IS NULL OR OLD.status != 'مكتمل') THEN
        
        RAISE LOG 'إرسال رسالة التقييم للطلب: %', NEW.order_number;
        
        -- جلب بيانات العميل
        SELECT name, whatsapp_number INTO customer_record
        FROM customers 
        WHERE id = NEW.customer_id;
        
        -- التحقق من وجود رقم واتساب
        IF customer_record.whatsapp_number IS NOT NULL AND customer_record.whatsapp_number != '' THEN
            
            -- جلب إعدادات جوجل
            SELECT * INTO google_settings
            FROM google_maps_settings
            LIMIT 1;
            
            -- إنشاء رابط التقييم
            IF google_settings.place_id IS NOT NULL THEN
                review_link := 'https://search.google.com/local/writereview?placeid=' || google_settings.place_id;
                
                -- إنشاء محتوى رسالة التقييم
                message_content := 'مرحباً ' || COALESCE(customer_record.name, 'عزيزنا العميل') || '! 🎉' || E'\n\n' ||
                    '✅ طلبك رقم: ' || NEW.order_number || ' تم إكماله بنجاح!' || E'\n\n' ||
                    '🌟 نرجو منك تقييم تجربتك معنا على خرائط جوجل:' || E'\n' ||
                    review_link || E'\n\n' ||
                    'تقييمك مهم جداً لنا ويساعدنا على تحسين خدماتنا.' || E'\n\n' ||
                    'شكراً لاختيارك خدماتنا! 🙏';
                
                -- جلب webhook التقييم - استخدام اسم متغير مختلف
                SELECT ws.webhook_url INTO evaluation_webhook_url
                FROM webhook_settings ws
                WHERE ws.webhook_type = 'evaluation' AND ws.is_active = true
                LIMIT 1;
                
                -- إذا لم يوجد webhook تقييم، استخدم webhook عادي
                IF evaluation_webhook_url IS NULL THEN
                    SELECT ws.webhook_url INTO evaluation_webhook_url
                    FROM webhook_settings ws
                    WHERE ws.webhook_type = 'outgoing' AND ws.is_active = true
                    LIMIT 1;
                END IF;
                
                IF evaluation_webhook_url IS NOT NULL THEN
                    -- إعداد البيانات للإرسال
                    payload := jsonb_build_object(
                        'to', customer_record.whatsapp_number,
                        'phone', customer_record.whatsapp_number,
                        'phoneNumber', customer_record.whatsapp_number,
                        'message', message_content,
                        'messageText', message_content,
                        'text', message_content,
                        'customer_name', customer_record.name,
                        'order_number', NEW.order_number,
                        'review_link', review_link,
                        'type', 'google_review',
                        'notification_type', 'google_review',
                        'timestamp', extract(epoch from now())::integer,
                        'order_id', NEW.id
                    );
                    
                    RAISE LOG 'إرسال للـ webhook: %', evaluation_webhook_url;
                    RAISE LOG 'البيانات: %', payload::text;
                    
                    -- إرسال للـ webhook
                    PERFORM net.http_post(
                        url := evaluation_webhook_url,
                        headers := '{"Content-Type": "application/json"}'::jsonb,
                        body := payload
                    );
                    
                    -- حفظ الرسالة في قاعدة البيانات
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
                        'sent',
                        NEW.customer_id,
                        NOW()
                    );
                    
                    RAISE LOG 'تم إرسال رسالة التقييم بنجاح';
                ELSE
                    RAISE LOG 'لا يوجد webhook نشط';
                END IF;
            ELSE
                RAISE LOG 'لا توجد إعدادات خرائط جوجل';
            END IF;
        ELSE
            RAISE LOG 'لا يوجد رقم واتساب للعميل';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;