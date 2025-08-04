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
) LIMIT 100;

-- إنشاء قيود المدفوعات للطلبات الموجودة
INSERT INTO account_entries (account_id, reference_type, reference_id, description, debit_amount, credit_amount, created_by)
SELECT 
    CASE 
        WHEN p.payment_type = 'نقدي' THEN cash.id
        WHEN p.payment_type = 'تحويل بنكي' THEN bank.id
        WHEN p.payment_type = 'الشبكة' THEN network.id
        ELSE cash.id
    END as account_id,
    'دفعة_طلب' as reference_type,
    p.id as reference_id,
    'استلام دفعة ' || p.payment_type || ' من العميل: ' || COALESCE(c.name, 'غير محدد') || ' للطلب: ' || COALESCE(o.order_number, 'غير محدد') as description,
    p.amount as debit_amount,
    0 as credit_amount,
    p.created_by
FROM payments p
JOIN orders o ON p.order_id = o.id
JOIN customers c ON o.customer_id = c.id
CROSS JOIN (SELECT id FROM accounts WHERE account_name = 'النقدية' AND account_type = 'أصول') cash
CROSS JOIN (SELECT id FROM accounts WHERE account_name = 'البنك' AND account_type = 'أصول') bank
CROSS JOIN (SELECT id FROM accounts WHERE account_name = 'الشبكة' AND account_type = 'أصول') network
WHERE p.order_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM account_entries ae 
    WHERE ae.reference_type = 'دفعة_طلب' AND ae.reference_id = p.id
) LIMIT 100;