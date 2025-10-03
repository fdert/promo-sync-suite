-- إنشاء دالة لحذف الطلب مع جميع البيانات المرتبطة
CREATE OR REPLACE FUNCTION public.delete_order_with_related_data(order_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_items_count INT := 0;
  deleted_payments_count INT := 0;
  deleted_invoices_count INT := 0;
  deleted_entries_count INT := 0;
  deleted_invoice_items_count INT := 0;
  result JSON;
BEGIN
  -- حذف بنود الطلب
  DELETE FROM public.order_items
  WHERE order_id = order_id_param;
  GET DIAGNOSTICS deleted_items_count = ROW_COUNT;

  -- حذف المدفوعات المرتبطة بالطلب
  DELETE FROM public.payments
  WHERE order_id = order_id_param;
  GET DIAGNOSTICS deleted_payments_count = ROW_COUNT;

  -- حذف القيود المحاسبية المرتبطة بالطلب
  DELETE FROM public.account_entries
  WHERE reference_id = order_id_param AND reference_type = 'order';
  GET DIAGNOSTICS deleted_entries_count = ROW_COUNT;

  -- حذف بنود الفواتير المرتبطة بفواتير الطلب
  DELETE FROM public.invoice_items
  WHERE invoice_id IN (
    SELECT id FROM public.invoices WHERE order_id = order_id_param
  );
  GET DIAGNOSTICS deleted_invoice_items_count = ROW_COUNT;

  -- حذف الفواتير المرتبطة بالطلب
  DELETE FROM public.invoices
  WHERE order_id = order_id_param;
  GET DIAGNOSTICS deleted_invoices_count = ROW_COUNT;

  -- حذف الطلب نفسه
  DELETE FROM public.orders
  WHERE id = order_id_param;

  -- بناء النتيجة
  result := json_build_object(
    'success', true,
    'deleted_items', deleted_items_count,
    'deleted_payments', deleted_payments_count,
    'deleted_invoices', deleted_invoices_count,
    'deleted_invoice_items', deleted_invoice_items_count,
    'deleted_account_entries', deleted_entries_count,
    'message', 'تم حذف الطلب وجميع البيانات المرتبطة بنجاح'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    -- في حالة حدوث خطأ، إرجاع تفاصيل الخطأ
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'فشل في حذف الطلب'
    );
END;
$$;