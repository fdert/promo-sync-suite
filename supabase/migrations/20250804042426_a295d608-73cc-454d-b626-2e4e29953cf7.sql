-- إصلاح الفواتير التي لديها مبالغ مدفوعة دون قيود محاسبية
-- أولاً: إنشاء مدفوعات للفواتير التي لديها paid_amount ولكن لا توجد مدفوعات مسجلة

INSERT INTO payments (
    invoice_id,
    amount,
    payment_date,
    payment_type,
    notes,
    created_by
)
SELECT 
    i.id,
    i.paid_amount,
    CURRENT_DATE,
    'تسوية محاسبية',
    'تسوية تلقائية للمبالغ المدفوعة بدون قيود محاسبية - فاتورة ' || i.invoice_number,
    i.created_by
FROM invoices i
WHERE i.paid_amount > 0 
  AND NOT EXISTS (
      SELECT 1 FROM payments p WHERE p.invoice_id = i.id
  )
  AND i.id IN (
      -- فقط الفواتير المحددة التي تحتاج تسوية
      SELECT id FROM invoices 
      WHERE invoice_number IN ('INV-018', 'INV-017', 'INV-014', 'INV-013')
  );