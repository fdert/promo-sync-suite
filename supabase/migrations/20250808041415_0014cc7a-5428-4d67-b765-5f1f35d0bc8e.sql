-- دالة معالجة الحملات الجماعية مع إضافة الرسائل للواتساب مباشرة
CREATE OR REPLACE FUNCTION public.process_and_send_bulk_campaign(campaign_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    campaign_record RECORD;
    customer_record RECORD;
    message_count INTEGER := 0;
    sent_count INTEGER := 0;
    result_json jsonb;
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
    
    -- إضافة رسائل للعملاء حسب نوع الاستهداف
    IF campaign_record.target_type = 'all' THEN
        -- إضافة رسائل لجميع العملاء النشطين
        FOR customer_record IN 
            SELECT id, name, COALESCE(whatsapp_number, phone) as phone_number
            FROM customers 
            WHERE status = 'نشط'
            AND COALESCE(whatsapp_number, phone) IS NOT NULL 
            AND COALESCE(whatsapp_number, phone) != ''
        LOOP
            -- إضافة رسالة إلى جدول الحملات
            INSERT INTO bulk_campaign_messages (
                campaign_id, customer_id, whatsapp_number, message_content, status
            ) VALUES (
                campaign_id_param,
                customer_record.id,
                customer_record.phone_number,
                REPLACE(REPLACE(
                    campaign_record.message_content, 
                    '{{customer_name}}', customer_record.name
                ), '{{date}}', TO_CHAR(now(), 'DD/MM/YYYY')),
                'pending'
            );
            
            -- إضافة رسالة إلى جدول الواتساب مباشرة
            INSERT INTO whatsapp_messages (
                from_number, to_number, message_type, message_content, 
                status, customer_id, created_at
            ) VALUES (
                'system',
                customer_record.phone_number,
                'text',
                REPLACE(REPLACE(
                    campaign_record.message_content, 
                    '{{customer_name}}', customer_record.name
                ), '{{date}}', TO_CHAR(now(), 'DD/MM/YYYY')),
                'pending',
                customer_record.id,
                now()
            );
            
            message_count := message_count + 1;
            sent_count := sent_count + 1;
        END LOOP;
        
    ELSE
        -- إضافة رسائل للمجموعات المحددة
        FOR customer_record IN 
            SELECT c.id, c.name, COALESCE(c.whatsapp_number, c.phone) as phone_number
            FROM customers c
            JOIN customer_group_members cgm ON c.id = cgm.customer_id
            WHERE cgm.group_id = ANY(campaign_record.target_groups)
            AND c.status = 'نشط'
            AND COALESCE(c.whatsapp_number, c.phone) IS NOT NULL 
            AND COALESCE(c.whatsapp_number, c.phone) != ''
        LOOP
            -- إضافة رسالة إلى جدول الحملات
            INSERT INTO bulk_campaign_messages (
                campaign_id, customer_id, whatsapp_number, message_content, status
            ) VALUES (
                campaign_id_param,
                customer_record.id,
                customer_record.phone_number,
                REPLACE(REPLACE(
                    campaign_record.message_content, 
                    '{{customer_name}}', customer_record.name
                ), '{{date}}', TO_CHAR(now(), 'DD/MM/YYYY')),
                'pending'
            );
            
            -- إضافة رسالة إلى جدول الواتساب مباشرة
            INSERT INTO whatsapp_messages (
                from_number, to_number, message_type, message_content, 
                status, customer_id, created_at
            ) VALUES (
                'system',
                customer_record.phone_number,
                'text',
                REPLACE(REPLACE(
                    campaign_record.message_content, 
                    '{{customer_name}}', customer_record.name
                ), '{{date}}', TO_CHAR(now(), 'DD/MM/YYYY')),
                'pending',
                customer_record.id,
                now()
            );
            
            message_count := message_count + 1;
            sent_count := sent_count + 1;
        END LOOP;
    END IF;
    
    -- تحديث إحصائيات الحملة
    UPDATE bulk_campaigns 
    SET 
        total_recipients = message_count,
        sent_count = sent_count,
        status = 'completed',
        completed_at = now()
    WHERE id = campaign_id_param;
    
    -- إرجاع النتيجة
    result_json := jsonb_build_object(
        'success', true,
        'message', 'تم إرسال الحملة بنجاح',
        'campaign_id', campaign_id_param,
        'total_recipients', message_count,
        'sent_count', sent_count
    );
    
    RETURN result_json;
    
EXCEPTION
    WHEN OTHERS THEN
        -- في حالة الخطأ، تحديث حالة الحملة
        UPDATE bulk_campaigns 
        SET 
            status = 'failed',
            error_message = SQLERRM,
            completed_at = now()
        WHERE id = campaign_id_param;
        
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;