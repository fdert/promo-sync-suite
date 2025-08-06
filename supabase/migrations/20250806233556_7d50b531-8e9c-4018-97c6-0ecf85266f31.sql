-- تحديث دالة إرسال رابط التقييم لإضافة رسالة واتساب تلقائية
CREATE OR REPLACE FUNCTION public.send_evaluation_link_on_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    customer_record RECORD;
    evaluation_token TEXT;
    google_settings RECORD;
    review_link TEXT;
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
            );
            
            -- جلب إعدادات خرائط جوجل
            SELECT * INTO google_settings
            FROM google_maps_settings
            LIMIT 1;
            
            -- إنشاء رابط التقييم إذا كانت الإعدادات متوفرة
            IF google_settings.place_id IS NOT NULL THEN
                review_link := 'https://search.google.com/local/writereview?placeid=' || google_settings.place_id;
                
                -- إرسال رسالة واتساب تلقائية إذا كان رقم الواتساب متوفر
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
                        '🌟 نرجو منك تقييم تجربتك معنا على خرائط جوجل من خلال الرابط التالي:' || E'\n' ||
                        review_link || E'\n\n' ||
                        'تقييمك مهم جداً لنا ويساعدنا على تحسين خدماتنا.' || E'\n\n' ||
                        'شكراً لاختيارك خدماتنا! 🙏',
                        'pending',
                        NEW.customer_id,
                        NOW()
                    );
                    
                    RAISE LOG 'تم إنشاء رسالة واتساب تلقائية مع رابط تقييم جوجل للطلب: %', NEW.order_number;
                END IF;
            END IF;
            
            RAISE LOG 'تم إنشاء تقييم للطلب: % مع رسالة واتساب تلقائية', NEW.order_number;
            
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;