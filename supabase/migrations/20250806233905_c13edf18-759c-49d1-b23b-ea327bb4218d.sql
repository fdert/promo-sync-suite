-- إصلاح مشاكل إرسال رسالة الواتساب التلقائية

-- 1. تفعيل الـ trigger
ALTER TABLE orders ENABLE TRIGGER send_evaluation_link_trigger;

-- 2. تحديث دالة trigger لتكون أكثر دقة في إنشاء place_id
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
            
            RAISE LOG 'تم إنشاء تقييم برمز: %', evaluation_token;
            
            -- جلب إعدادات خرائط جوجل
            SELECT * INTO google_settings
            FROM google_maps_settings
            LIMIT 1;
            
            -- إنشاء رابط التقييم إذا كانت الإعدادات متوفرة
            IF google_settings.place_id IS NOT NULL THEN
                -- استخراج place_id الصحيح من الرابط
                IF google_settings.place_id LIKE '%ChIJ%' THEN
                    -- إذا كان place_id يحتوي على معرف جوجل صحيح
                    place_id_clean := substring(google_settings.place_id from 'ChIJ[a-zA-Z0-9_-]+');
                    review_link := 'https://search.google.com/local/writereview?placeid=' || place_id_clean;
                ELSE
                    -- استخدام place_id كما هو إذا كان صحيح
                    review_link := 'https://search.google.com/local/writereview?placeid=' || google_settings.place_id;
                END IF;
                
                RAISE LOG 'تم إنشاء رابط التقييم: %', review_link;
                
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
                    
                    RAISE LOG 'تم إنشاء رسالة واتساب للعميل: % برقم: %', customer_record.name, customer_record.whatsapp_number;
                ELSE
                    RAISE LOG 'لا يوجد رقم واتساب للعميل: %', customer_record.name;
                END IF;
            ELSE
                RAISE LOG 'لا توجد إعدادات خرائط جوجل محفوظة';
            END IF;
            
        ELSE
            RAISE LOG 'يوجد تقييم مسبق للطلب: %', NEW.order_number;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- 3. تحديث place_id في إعدادات جوجل لاستخدام معرف صحيح
UPDATE google_maps_settings 
SET place_id = 'ChIJs5ydyTiuEmsR0fRSlU0C7k0'
WHERE place_id LIKE '%ChIJs5ydyTiuEmsR0fRSlU0C7k0%';