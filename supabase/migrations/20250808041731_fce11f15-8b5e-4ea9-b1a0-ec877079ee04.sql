-- دالة شاملة لمعالجة وإرسال الحملات المجمعة (مصححة)
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
    sent_count INTEGER := 0;
    failed_count INTEGER := 0;
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
    
    -- إنشاء الرسائل حسب نوع الاستهداف
    IF campaign_record.target_type = 'all' THEN
        -- إضافة رسائل لجميع العملاء
        INSERT INTO bulk_campaign_messages (
            campaign_id, customer_id, whatsapp_number, message_content
        )
        SELECT 
            campaign_id_param,
            c.id,
            COALESCE(c.whatsapp_number, c.phone),
            REPLACE(REPLACE(
                campaign_record.message_content, 
                '{{customer_name}}', c.name
            ), '{{date}}', TO_CHAR(now(), 'DD/MM/YYYY'))
        FROM customers c
        WHERE COALESCE(c.whatsapp_number, c.phone) IS NOT NULL 
        AND COALESCE(c.whatsapp_number, c.phone) != '';
        
    ELSE
        -- إضافة رسائل للمجموعات المحددة
        INSERT INTO bulk_campaign_messages (
            campaign_id, customer_id, whatsapp_number, message_content
        )
        SELECT 
            campaign_id_param,
            c.id,
            COALESCE(c.whatsapp_number, c.phone),
            REPLACE(REPLACE(
                campaign_record.message_content, 
                '{{customer_name}}', c.name
            ), '{{date}}', TO_CHAR(now(), 'DD/MM/YYYY'))
        FROM customers c
        JOIN customer_group_members cgm ON c.id = cgm.customer_id
        WHERE cgm.group_id = ANY(campaign_record.target_groups)
        AND COALESCE(c.whatsapp_number, c.phone) IS NOT NULL 
        AND COALESCE(c.whatsapp_number, c.phone) != '';
    END IF;
    
    -- حساب العدد الإجمالي للرسائل
    GET DIAGNOSTICS message_count = ROW_COUNT;
    
    -- نسخ الرسائل إلى جدول whatsapp_messages للإرسال الفعلي
    FOR message_record IN 
        SELECT * FROM bulk_campaign_messages 
        WHERE campaign_id = campaign_id_param AND status = 'pending'
    LOOP
        BEGIN
            INSERT INTO whatsapp_messages (
                from_number, 
                to_number, 
                message_type, 
                message_content, 
                status, 
                customer_id
            ) VALUES (
                'system',
                message_record.whatsapp_number,
                'text',
                message_record.message_content,
                'pending',
                message_record.customer_id
            );
            
            -- تحديث حالة الرسالة في الحملة
            UPDATE bulk_campaign_messages 
            SET status = 'sent', sent_at = now()
            WHERE id = message_record.id;
            
            sent_count := sent_count + 1;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- في حالة حدوث خطأ
                UPDATE bulk_campaign_messages 
                SET status = 'failed', error_message = SQLERRM
                WHERE id = message_record.id;
                
                failed_count := failed_count + 1;
        END;
    END LOOP;
    
    -- تحديث إحصائيات الحملة
    UPDATE bulk_campaigns 
    SET 
        total_recipients = message_count,
        sent_count = sent_count,
        failed_count = failed_count,
        status = 'completed',
        completed_at = now()
    WHERE id = campaign_id_param;
    
    -- إرجاع النتائج
    result := jsonb_build_object(
        'success', true,
        'campaign_id', campaign_id_param,
        'total_recipients', message_count,
        'sent_count', sent_count,
        'failed_count', failed_count,
        'message', 'تم إرسال الحملة بنجاح'
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- تحديث حالة الحملة في حالة حدوث خطأ
        UPDATE bulk_campaigns 
        SET status = 'failed', completed_at = now()
        WHERE id = campaign_id_param;
        
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'campaign_id', campaign_id_param
        );
END;
$function$;