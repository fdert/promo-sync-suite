-- حذف الفواتير والطلبات للعملاء غير المحددين (null customer_id)
-- أولاً نحذف المدفوعات المرتبطة بالفواتير
DELETE FROM payments 
WHERE invoice_id IN (
  SELECT id FROM invoices WHERE customer_id IS NULL
);

-- نحذف بنود الفواتير
DELETE FROM invoice_items 
WHERE invoice_id IN (
  SELECT id FROM invoices WHERE customer_id IS NULL
);

-- نحذف الفواتير للعملاء غير المحددين
DELETE FROM invoices WHERE customer_id IS NULL;

-- نحذف بنود الطلبات للطلبات بدون عملاء
DELETE FROM order_items 
WHERE order_id IN (
  SELECT id FROM orders WHERE customer_id IS NULL
);

-- نحذف الطلبات للعملاء غير المحددين
DELETE FROM orders WHERE customer_id IS NULL;

-- تحديث رصيد العملاء المدينين بعد الحذف
SELECT sync_accounts_receivable_balance();