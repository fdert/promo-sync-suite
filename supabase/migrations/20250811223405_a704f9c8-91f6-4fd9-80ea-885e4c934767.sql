-- إنشاء دالة محدثة لحساب المدفوعات الصحيحة للطلبات
CREATE OR REPLACE FUNCTION public.send_whatsapp_notification_improved(
    customer_id_param UUID, 
    template_name_param TEXT, 
    order_data JSONB DEFAULT NULL::JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    customer_record RECORD;
    template_record RECORD;
    message_content TEXT;
    order_items_text TEXT := '';
    evaluation_link TEXT := '';
    actual_paid_amount NUMERIC := 0;
    actual_remaining_amount NUMERIC := 0;
    total_order_amount NUMERIC := 0;
BEGIN
    -- الحصول على بيانات العميل
    SELECT name, whatsapp_number INTO customer_record
    FROM customers 
    WHERE id = customer_id_param;
    
    -- التحقق من وجود رقم واتساب
    IF customer_record.whatsapp_number IS NULL OR customer_record.whatsapp_number = '' THEN
        RETURN FALSE;
    END IF;
    
    -- الحصول على قالب الرسالة
    SELECT template_content INTO template_record
    FROM message_templates 
    WHERE template_name = template_name_param AND is_active = true;
    
    IF template_record.template_content IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- إعداد محتوى الرسالة
    message_content := template_record.template_content;
    
    -- استبدال المتغيرات الأساسية
    message_content := REPLACE(message_content, '{{customer_name}}', COALESCE(customer_record.name, 'عزيزنا العميل'));
    
    -- إذا كانت هناك بيانات طلب، استبدل متغيرات الطلب
    IF order_data IS NOT NULL THEN
        -- الحصول على المبلغ الإجمالي للطلب
        total_order_amount := COALESCE((order_data->>'amount')::NUMERIC, 0);
        
        -- حساب المبلغ المدفوع الفعلي من جدول المدفوعات
        IF order_data ? 'order_id' THEN
            SELECT COALESCE(SUM(amount), 0) INTO actual_paid_amount
            FROM payments 
            WHERE order_id = (order_data->>'order_id')::UUID;
        ELSE
            actual_paid_amount := 0;
        END IF;
        
        -- حساب المبلغ المتبقي
        actual_remaining_amount := total_order_amount - actual_paid_amount;
        
        message_content := REPLACE(message_content, '{{order_number}}', COALESCE(order_data->>'order_number', ''));
        message_content := REPLACE(message_content, '{{service_name}}', COALESCE(order_data->>'service_name', ''));
        message_content := REPLACE(message_content, '{{description}}', COALESCE(order_data->>'description', ''));
        message_content := REPLACE(message_content, '{{amount}}', COALESCE(total_order_amount::TEXT, '0'));
        message_content := REPLACE(message_content, '{{paid_amount}}', COALESCE(actual_paid_amount::TEXT, '0'));
        message_content := REPLACE(message_content, '{{remaining_amount}}', COALESCE(actual_remaining_amount::TEXT, '0'));
        message_content := REPLACE(message_content, '{{payment_type}}', COALESCE(order_data->>'payment_type', ''));
        message_content := REPLACE(message_content, '{{status}}', COALESCE(order_data->>'status', ''));
        message_content := REPLACE(message_content, '{{priority}}', COALESCE(order_data->>'priority', ''));
        message_content := REPLACE(message_content, '{{start_date}}', COALESCE(order_data->>'start_date', ''));
        message_content := REPLACE(message_content, '{{due_date}}', COALESCE(order_data->>'due_date', ''));
        
        -- إعداد قائمة بنود الطلب
        IF order_data ? 'order_items' AND order_data ? 'order_id' THEN
            SELECT STRING_AGG(
                '• ' || oi.item_name || ' - الكمية: ' || oi.quantity || ' - السعر: ' || oi.unit_price || ' ر.س',
                E'\n'
            ) INTO order_items_text
            FROM order_items oi
            WHERE oi.order_id = (order_data->>'order_id')::UUID;
            
            message_content := REPLACE(message_content, '{{order_items}}', COALESCE(order_items_text, 'لا توجد بنود'));
            
            -- عدد البنود
            message_content := REPLACE(message_content, '{{order_items_count}}', 
                COALESCE((SELECT COUNT(*)::TEXT FROM order_items WHERE order_id = (order_data->>'order_id')::UUID), '0'));
            
            -- إجمالي البنود
            message_content := REPLACE(message_content, '{{order_items_total}}', 
                COALESCE((SELECT SUM(total_amount)::TEXT FROM order_items WHERE order_id = (order_data->>'order_id')::UUID), '0'));
        END IF;
        
        -- إعداد رابط التقييم
        IF template_name_param IN ('order_completed', 'order_ready_for_delivery') THEN
            evaluation_link := 'https://gcuqfxacnbxdldsbmgvf.supabase.co/evaluation?order=' || (order_data->>'order_id');
            message_content := REPLACE(message_content, '{{evaluation_link}}', evaluation_link);
        END IF;
    END IF;
    
    -- إضافة التاريخ الحالي
    message_content := REPLACE(message_content, '{{date}}', TO_CHAR(NOW(), 'DD/MM/YYYY'));
    message_content := REPLACE(message_content, '{{company_name}}', 'شركتنا');
    
    -- حفظ الرسالة في قاعدة البيانات مع حالة "pending" لإرسالها لاحقاً
    INSERT INTO whatsapp_messages (
        from_number, 
        to_number, 
        message_type, 
        message_content, 
        status, 
        customer_id
    ) VALUES (
        'system',
        customer_record.whatsapp_number,
        'text',
        message_content,
        'pending',
        customer_id_param
    );
    
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        -- في حالة حدوث خطأ، سجل الرسالة كفاشلة
        INSERT INTO whatsapp_messages (
            from_number, 
            to_number, 
            message_type, 
            message_content, 
            status, 
            customer_id
        ) VALUES (
            'system',
            COALESCE(customer_record.whatsapp_number, 'unknown'),
            'text',
            COALESCE(message_content, 'خطأ في إرسال الرسالة'),
            'failed',
            customer_id_param
        );
        
        RETURN FALSE;
END;
$function$;