-- إصلاح عرض ملخص الفواتير مع المدفوعات
DROP VIEW IF EXISTS invoice_payment_summary;

CREATE VIEW invoice_payment_summary AS
SELECT 
  i.*,
  COALESCE(p.calculated_paid_amount, 0) as calculated_paid_amount,
  GREATEST(i.total_amount - COALESCE(p.calculated_paid_amount, 0), 0) as remaining_amount
FROM invoices i
LEFT JOIN (
  SELECT 
    invoice_id,
    SUM(amount) as calculated_paid_amount
  FROM payments 
  WHERE invoice_id IS NOT NULL
  GROUP BY invoice_id
) p ON i.id = p.invoice_id;

-- إصلاح عرض ملخص الطلبات مع المدفوعات
DROP VIEW IF EXISTS order_payment_summary;

CREATE VIEW order_payment_summary AS
SELECT 
  o.*,
  COALESCE(invoice_payments.calculated_paid_amount, direct_payments.calculated_paid_amount, 0) as calculated_paid_amount,
  GREATEST(o.amount - COALESCE(invoice_payments.calculated_paid_amount, direct_payments.calculated_paid_amount, 0), 0) as remaining_amount
FROM orders o
LEFT JOIN (
  -- المدفوعات من خلال الفواتير
  SELECT 
    i.order_id,
    SUM(p.amount) as calculated_paid_amount
  FROM invoices i
  JOIN payments p ON i.id = p.invoice_id
  GROUP BY i.order_id
) invoice_payments ON o.id = invoice_payments.order_id
LEFT JOIN (
  -- المدفوعات المباشرة للطلب (بدون فاتورة)
  SELECT 
    order_id,
    SUM(amount) as calculated_paid_amount
  FROM payments 
  WHERE order_id IS NOT NULL AND invoice_id IS NULL
  GROUP BY order_id
) direct_payments ON o.id = direct_payments.order_id;

-- تحديث رصيد العملاء المدينين
SELECT sync_accounts_receivable_balance();