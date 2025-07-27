-- تحديث المدفوعات لربطها بالفواتير المناسبة
UPDATE payments 
SET invoice_id = (
  SELECT i.id 
  FROM invoices i 
  WHERE i.order_id = payments.order_id
  LIMIT 1
)
WHERE invoice_id IS NULL AND order_id IS NOT NULL;

-- تحديث الفواتير لتعكس المبالغ المدفوعة الصحيحة
UPDATE invoices 
SET paid_amount = COALESCE((
  SELECT SUM(p.amount) 
  FROM payments p 
  WHERE p.invoice_id = invoices.id
), 0);

-- تحديث حالة الفواتير بناءً على المبلغ المدفوع
UPDATE invoices 
SET status = CASE 
  WHEN paid_amount >= total_amount THEN 'مدفوع'
  WHEN paid_amount > 0 THEN 'مدفوع جزئياً'
  ELSE 'قيد الانتظار'
END;