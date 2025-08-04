-- حذف العناصر التابعة أولاً
DROP VIEW IF EXISTS customer_outstanding_balances CASCADE;
DROP TRIGGER IF EXISTS update_accounts_receivable_trigger ON invoices CASCADE;

-- إزالة حقول paid_amount من الجداول
ALTER TABLE invoices DROP COLUMN IF EXISTS paid_amount CASCADE;
ALTER TABLE orders DROP COLUMN IF EXISTS paid_amount CASCADE;

-- إعادة إنشاء view العملاء المدينين بالمنطق الجديد
CREATE VIEW customer_outstanding_balances AS
SELECT 
    c.id as customer_id,
    c.name as customer_name,
    COALESCE(SUM(i.total_amount - COALESCE(p.total_payments, 0)), 0) as outstanding_balance,
    COUNT(CASE WHEN (i.total_amount - COALESCE(p.total_payments, 0)) > 0 THEN 1 END) as unpaid_invoices_count,
    MIN(CASE WHEN (i.total_amount - COALESCE(p.total_payments, 0)) > 0 THEN i.due_date END) as earliest_due_date,
    MAX(CASE WHEN (i.total_amount - COALESCE(p.total_payments, 0)) > 0 THEN i.due_date END) as latest_due_date
FROM customers c
LEFT JOIN invoices i ON i.customer_id = c.id
LEFT JOIN (
    SELECT invoice_id, SUM(amount) as total_payments
    FROM payments
    GROUP BY invoice_id
) p ON p.invoice_id = i.id
GROUP BY c.id, c.name
HAVING COALESCE(SUM(i.total_amount - COALESCE(p.total_payments, 0)), 0) > 0;