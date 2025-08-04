-- تسديد جميع الفواتير المستحقة للعملاء المدينين
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

-- تحديث حالة الفواتير المسددة إلى "مدفوعة"
UPDATE invoices 
SET 
  status = 'مدفوعة',
  payment_date = CURRENT_DATE,
  updated_at = now()
WHERE id IN (
  SELECT i.id 
  FROM invoices i
  LEFT JOIN (
    SELECT invoice_id, SUM(amount) as paid_amount
    FROM payments 
    WHERE invoice_id IS NOT NULL
    GROUP BY invoice_id
  ) p ON i.id = p.invoice_id
  WHERE i.total_amount <= COALESCE(p.paid_amount, 0) + 0.01
);