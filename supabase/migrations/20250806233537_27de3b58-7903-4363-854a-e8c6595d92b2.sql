-- تحديث دالة إرسال رابط التقييم لإرسال رسالة واتساب مع رابط جوجل
CREATE OR REPLACE FUNCTION public.send_evaluation_link_on_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    customer_record RECORD;
    evaluation_token TEXT;
    evaluation_id UUID;
    google_settings RECORD;
    review_link TEXT;
BEGIN
    -- التحقق من تغيير الحالة إلى "مكتمل"
    IF NEW.status = 'مكتمل' AND (OLD.status IS NULL OR OLD.status != 'مكتمل') THEN
        
        -- جلب بيانات العميل
        SELECT name, whatsapp_number INTO customer_record
        FROM customers 
        WHERE id = NEW.customer_id;
        
        -- التحقق من وجود رقم واتساب
        IF customer_record.whatsapp_number IS NOT NULL AND customer_record.whatsapp_number != '' THEN
            
            -- التحقق من عدم وجود تقييم مسبق لهذا الطلب
            IF NOT EXISTS (SELECT 1 FROM evaluations WHERE order_id = NEW.id) THEN
                
                -- إنشاء رمز تقييم فريد
                evaluation_token := 'eval_' || NEW.id || '_' || extract(epoch from now())::text;
                
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
                
                -- جلب إعدادات خرائط جوجل
                SELECT * INTO google_settings
                FROM google_maps_settings
                LIMIT 1;
                
                -- إنشاء رابط التقييم لجوجل
                IF google_settings.place_id IS NOT NULL THEN
                    review_link := 'https://search.google.com/local/writereview?placeid=' || google_settings.place_id;
                    
                    -- تحديث التقييم برابط جوجل
                    UPDATE evaluations 
                    SET google_review_link = review_link,
                        google_review_status = 'sent_to_customer',
                        google_review_sent_at = NOW()
                    WHERE id = evaluation_id;
                    
                    -- إضافة سجل في طلبات التقييم
                    INSERT INTO google_review_requests (
                        evaluation_id,
                        customer_id,
                        review_link,
                        status,
                        sent_at,
                        created_by
                    ) VALUES (
                        evaluation_id,
                        NEW.customer_id,
                        review_link,
                        'sent',
                        NOW(),
                        NEW.updated_by
                    );
                    
                    -- إرسال رسالة واتساب مع رابط التقييم
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
                        '✅ تم إكمال طلبك رقم: ' || NEW.order_number || E'\n\n' ||
                        '🌟 نرجو منك تقييم تجربتك معنا على خرائط جوجل:' || E'\n' ||
                        review_link || E'\n\n' ||
                        'تقييمك يساعدنا على تحسين خدماتنا 💕' || E'\n\n' ||
                        'شكراً لثقتك بخدماتنا! 🙏' || E'\n' ||
                        'وكالة الإبداع للدعاية والإعلان',
                        'pending',
                        NEW.customer_id,
                        NOW()
                    );
                    
                    RAISE LOG 'تم إنشاء تقييم وإرسال رابط جوجل للطلب: %', NEW.order_number;
                ELSE
                    RAISE LOG 'لم يتم العثور على إعدادات خرائط جوجل للطلب: %', NEW.order_number;
                END IF;
                
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;