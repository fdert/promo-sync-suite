-- دالة لحذف الطلب مع جميع البيانات المرتبطة به
CREATE OR REPLACE FUNCTION public.delete_order_with_related_data(order_id_param uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    deleted_data JSONB := '{}';
    order_record RECORD;
    items_count INTEGER := 0;
    payments_count INTEGER := 0;
    invoices_count INTEGER := 0;
    entries_count INTEGER := 0;
    evaluations_count INTEGER := 0;
    print_orders_count INTEGER := 0;
BEGIN
    -- التحقق من وجود الطلب والحصول على معلوماته
    SELECT * INTO order_record FROM orders WHERE id = order_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;
    
    -- حذف بنود الطلب
    DELETE FROM order_items WHERE order_id = order_id_param;
    GET DIAGNOSTICS items_count = ROW_COUNT;
    
    -- حذف القيود المحاسبية المرتبطة بالمدفوعات
    DELETE FROM account_entries 
    WHERE reference_type = 'دفعة' 
    AND reference_id IN (SELECT id FROM payments WHERE order_id = order_id_param);
    GET DIAGNOSTICS entries_count = ROW_COUNT;
    
    -- حذف المدفوعات
    DELETE FROM payments WHERE order_id = order_id_param;
    GET DIAGNOSTICS payments_count = ROW_COUNT;
    
    -- حذف بنود الفواتير المرتبطة
    DELETE FROM invoice_items 
    WHERE invoice_id IN (SELECT id FROM invoices WHERE order_id = order_id_param);
    
    -- حذف الفواتير
    DELETE FROM invoices WHERE order_id = order_id_param;
    GET DIAGNOSTICS invoices_count = ROW_COUNT;
    
    -- حذف التقييمات
    DELETE FROM evaluations WHERE order_id = order_id_param;
    GET DIAGNOSTICS evaluations_count = ROW_COUNT;
    
    -- حذف طلبات الطباعة إذا وجدت
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'print_orders') THEN
        EXECUTE 'DELETE FROM print_orders WHERE order_id = $1' USING order_id_param;
        GET DIAGNOSTICS print_orders_count = ROW_COUNT;
    END IF;
    
    -- حذف رسائل الواتساب المرتبطة (اختياري)
    DELETE FROM whatsapp_messages 
    WHERE message_content LIKE '%' || order_record.order_number || '%';
    
    -- أخيراً حذف الطلب نفسه
    DELETE FROM orders WHERE id = order_id_param;
    
    -- إعداد تقرير الحذف
    deleted_data := jsonb_build_object(
        'success', true,
        'order_number', order_record.order_number,
        'deleted_items', items_count,
        'deleted_payments', payments_count,
        'deleted_invoices', invoices_count,
        'deleted_account_entries', entries_count,
        'deleted_evaluations', evaluations_count,
        'deleted_print_orders', print_orders_count
    );
    
    RETURN deleted_data;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$$;