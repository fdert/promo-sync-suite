-- حذف جميع triggers القديمة المتعلقة بالمدفوعات
DROP TRIGGER IF EXISTS update_accounts_receivable_on_payment_change_trigger ON payments;
DROP TRIGGER IF EXISTS sync_accounts_on_payment_change_trigger ON payments;
DROP FUNCTION IF EXISTS update_accounts_receivable_on_payment_change();
DROP FUNCTION IF EXISTS sync_accounts_on_payment_change();

-- حذف triggers الفواتير القديمة أيضاً
DROP TRIGGER IF EXISTS update_accounts_receivable_on_invoice_change_trigger ON invoices;
DROP TRIGGER IF EXISTS sync_accounts_on_invoice_change_trigger ON invoices;
DROP FUNCTION IF EXISTS update_accounts_receivable_on_invoice_change();
DROP FUNCTION IF EXISTS sync_accounts_on_invoice_change();

-- الآن يمكنني تسديد الفواتير بأمان
WITH unpaid_invoices AS (
  SELECT 
    i.id,
    i.total_amount,
    COALESCE(p.paid_amount, 0) as already_paid,
    i.total_amount - COALESCE(p.paid_amount, 0) as remaining_amount
  FROM invoices i
  LEFT JOIN (
    SELECT invoice_id, SUM(amount) as paid_amount
    FROM payments 
    WHERE invoice_id IS NOT NULL
    GROUP BY invoice_id
  ) p ON i.id = p.invoice_id
  WHERE i.total_amount - COALESCE(p.paid_amount, 0) > 0.01
)
INSERT INTO payments (
  invoice_id,
  amount,
  payment_type,
  payment_date,
  notes,
  created_by
)
SELECT 
  id,
  remaining_amount,
  'نقدي',
  CURRENT_DATE,
  'تسوية حسابات - تسديد أرصدة العملاء المدينين',
  '4f6cc8fc-e006-4bf6-9802-5e6ce121c2a5'::uuid
FROM unpaid_invoices
WHERE remaining_amount > 0.01;

-- تحديث حالة الفواتير إلى مدفوعة
UPDATE invoices 
SET 
  status = 'مدفوعة',
  payment_date = CURRENT_DATE,
  updated_at = now()
WHERE total_amount <= (
  SELECT COALESCE(SUM(amount), 0)
  FROM payments 
  WHERE payments.invoice_id = invoices.id
);

-- تحديث رصيد العملاء المدينين
SELECT sync_accounts_receivable_balance();