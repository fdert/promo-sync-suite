-- تحديث دالة معالجة وإرسال الحملات الجماعية لضمان استخدام أرقام الهواتف الصحيحة
CREATE OR REPLACE FUNCTION public.process_and_send_bulk_campaign(campaign_id_param uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    campaign_record RECORD;
    message_record RECORD;
    message_count INTEGER := 0;
    messages_sent INTEGER := 0;
    messages_failed INTEGER := 0;
    webhook_url_var TEXT;
    result jsonb;
BEGIN
    -- جلب بيانات الحملة
    SELECT * INTO campaign_record
    FROM bulk_campaigns 
    WHERE id = campaign_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Campaign not found'
        );
    END IF;
    
    -- تحديث حالة الحملة إلى "sending"
    UPDATE bulk_campaigns 
    SET status = 'sending', started_at = now()
    WHERE id = campaign_id_param;
    
    -- إنشاء الرسائل حسب نوع الاستهداف مع التأكد من استخدام أرقام الهواتف الصحيحة
    IF campaign_record.target_type = 'all' THEN
        -- إضافة رسائل لجميع العملاء مع فلترة أفضل للأرقام
        INSERT INTO bulk_campaign_messages (
            campaign_id, customer_id, whatsapp_number, message_content
        )
        SELECT 
            campaign_id_param,
            c.id,
            CASE 
                WHEN c.whatsapp_number IS NOT NULL AND c.whatsapp_number != '' THEN c.whatsapp_number
                WHEN c.phone IS NOT NULL AND c.phone != '' THEN c.phone
                ELSE NULL
            END as phone_number,
            REPLACE(REPLACE(REPLACE(
                campaign_record.message_content, 
                '{{customer_name}}', COALESCE(c.name, 'عزيزنا العميل')
            ), '{{date}}', TO_CHAR(now(), 'DD/MM/YYYY')), '{{company_name}}', 'وكالة الإبداع للدعاية والإعلان')
        FROM customers c
        WHERE (c.whatsapp_number IS NOT NULL AND c.whatsapp_number != '' AND c.whatsapp_number ~ '^\+?[0-9]+$')
           OR (c.phone IS NOT NULL AND c.phone != '' AND c.phone ~ '^\+?[0-9]+$');
        
    ELSE
        -- إضافة رسائل للمجموعات المحددة مع فلترة أفضل للأرقام
        INSERT INTO bulk_campaign_messages (
            campaign_id, customer_id, whatsapp_number, message_content
        )
        SELECT 
            campaign_id_param,
            c.id,
            CASE 
                WHEN c.whatsapp_number IS NOT NULL AND c.whatsapp_number != '' THEN c.whatsapp_number
                WHEN c.phone IS NOT NULL AND c.phone != '' THEN c.phone
                ELSE NULL
            END as phone_number,
            REPLACE(REPLACE(REPLACE(
                campaign_record.message_content, 
                '{{customer_name}}', COALESCE(c.name, 'عزيزنا العميل')
            ), '{{date}}', TO_CHAR(now(), 'DD/MM/YYYY')), '{{company_name}}', 'وكالة الإبداع للدعاية والإعلان')
        FROM customers c
        JOIN customer_group_members cgm ON c.id = cgm.customer_id
        WHERE cgm.group_id = ANY(campaign_record.target_groups)
        AND ((c.whatsapp_number IS NOT NULL AND c.whatsapp_number != '' AND c.whatsapp_number ~ '^\+?[0-9]+$')
             OR (c.phone IS NOT NULL AND c.phone != '' AND c.phone ~ '^\+?[0-9]+$'));
    END IF;
    
    -- حساب العدد الإجمالي للرسائل
    GET DIAGNOSTICS message_count = ROW_COUNT;
    
    -- معلومات تشخيصية
    RAISE NOTICE 'تم إنشاء % رسائل للحملة %', message_count, campaign_id_param;
    
    -- نسخ الرسائل إلى جدول whatsapp_messages للإرسال الفعلي
    FOR message_record IN 
        SELECT bcm.id, bcm.whatsapp_number, bcm.message_content, bcm.customer_id
        FROM bulk_campaign_messages bcm
        WHERE bcm.campaign_id = campaign_id_param AND bcm.status = 'pending'
        AND bcm.whatsapp_number IS NOT NULL AND bcm.whatsapp_number != ''
    LOOP
        BEGIN
            -- تسجيل معلومات تشخيصية لكل رسالة
            RAISE NOTICE 'إرسال رسالة إلى: %', message_record.whatsapp_number;
            
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
                message_record.whatsapp_number,
                'text',
                message_record.message_content,
                'pending',
                message_record.customer_id,
                now()
            );
            
            -- تحديث حالة الرسالة في الحملة
            UPDATE bulk_campaign_messages 
            SET status = 'queued', sent_at = now()
            WHERE id = message_record.id;
            
            messages_sent := messages_sent + 1;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- في حالة حدوث خطأ
                RAISE NOTICE 'خطأ في إرسال الرسالة إلى %: %', message_record.whatsapp_number, SQLERRM;
                
                UPDATE bulk_campaign_messages 
                SET status = 'failed', error_message = SQLERRM
                WHERE id = message_record.id;
                
                messages_failed := messages_failed + 1;
        END;
    END LOOP;
    
    -- تحديث إحصائيات الحملة
    UPDATE bulk_campaigns 
    SET 
        total_recipients = message_count,
        sent_count = messages_sent,
        failed_count = messages_failed,
        status = CASE WHEN messages_sent > 0 THEN 'completed' ELSE 'failed' END,
        completed_at = now()
    WHERE id = campaign_id_param;
    
    -- إرجاع النتائج مع معلومات تشخيصية
    result := jsonb_build_object(
        'success', true,
        'campaign_id', campaign_id_param,
        'total_recipients', message_count,
        'sent_count', messages_sent,
        'failed_count', messages_failed,
        'message', CASE 
            WHEN messages_sent > 0 THEN 'تم إرسال الحملة بنجاح'
            ELSE 'لم يتم إرسال أي رسائل - تحقق من أرقام الهواتف'
        END
    );
    
    RAISE NOTICE 'نتائج الحملة: %', result;
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- تحديث حالة الحملة في حالة حدوث خطأ
        UPDATE bulk_campaigns 
        SET status = 'failed', completed_at = now(), error_message = SQLERRM
        WHERE id = campaign_id_param;
        
        RAISE NOTICE 'خطأ في معالجة الحملة: %', SQLERRM;
        
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'campaign_id', campaign_id_param
        );
END;
$function$;