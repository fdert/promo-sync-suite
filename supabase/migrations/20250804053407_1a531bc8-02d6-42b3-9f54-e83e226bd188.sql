-- تحديث check constraint لقبول "طلب" كنوع مرجع
ALTER TABLE account_entries DROP CONSTRAINT IF EXISTS account_entries_reference_type_check;
ALTER TABLE account_entries ADD CONSTRAINT account_entries_reference_type_check 
CHECK (reference_type IN ('دفعة', 'فاتورة', 'طلب', 'دفعة_طلب', 'مصروف', 'إيداع'));

-- إنشاء قيود محاسبية للطلبات الموجودة
INSERT INTO account_entries (account_id, reference_type, reference_id, description, debit_amount, credit_amount, created_by)
SELECT 
    ar.id as account_id,
    'طلب' as reference_type,
    o.id as reference_id,
    'طلب رقم: ' || o.order_number || ' للعميل: ' || COALESCE(c.name, 'غير محدد') as description,
    o.amount as debit_amount,
    0 as credit_amount,
    o.created_by
FROM orders o
JOIN customers c ON o.customer_id = c.id
CROSS JOIN (SELECT id FROM accounts WHERE account_name = 'العملاء المدينون' AND account_type = 'أصول') ar
WHERE NOT EXISTS (
    SELECT 1 FROM account_entries ae 
    WHERE ae.reference_type = 'طلب' AND ae.reference_id = o.id
) LIMIT 100;