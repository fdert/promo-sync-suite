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
);

-- إنشاء قيود الإيرادات للطلبات الموجودة
INSERT INTO account_entries (account_id, reference_type, reference_id, description, debit_amount, credit_amount, created_by)
SELECT 
    rev.id as account_id,
    'طلب' as reference_type,
    o.id as reference_id,
    'إيراد من طلب رقم: ' || o.order_number || ' للعميل: ' || COALESCE(c.name, 'غير محدد') as description,
    0 as debit_amount,
    o.amount as credit_amount,
    o.created_by
FROM orders o
JOIN customers c ON o.customer_id = c.id
CROSS JOIN (SELECT id FROM accounts WHERE account_name = 'إيرادات المبيعات' AND account_type = 'إيرادات') rev
WHERE NOT EXISTS (
    SELECT 1 FROM account_entries ae 
    WHERE ae.reference_type = 'طلب' AND ae.reference_id = o.id AND ae.account_id = rev.id
);