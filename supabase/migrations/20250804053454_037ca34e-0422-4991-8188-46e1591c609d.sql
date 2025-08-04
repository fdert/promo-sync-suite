-- إنشاء قيود العملاء المدينون للمدفوعات
INSERT INTO account_entries (account_id, reference_type, reference_id, description, debit_amount, credit_amount, created_by)
SELECT 
    ar.id as account_id,
    'دفعة_طلب' as reference_type,
    p.id as reference_id,
    'استلام دفعة ' || p.payment_type || ' من العميل: ' || COALESCE(c.name, 'غير محدد') || ' للطلب: ' || COALESCE(o.order_number, 'غير محدد') as description,
    0 as debit_amount,
    p.amount as credit_amount,
    p.created_by
FROM payments p
JOIN orders o ON p.order_id = o.id
JOIN customers c ON o.customer_id = c.id
CROSS JOIN (SELECT id FROM accounts WHERE account_name = 'العملاء المدينون' AND account_type = 'أصول') ar
WHERE p.order_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM account_entries ae 
    WHERE ae.reference_type = 'دفعة_طلب' AND ae.reference_id = p.id AND ae.account_id = ar.id
) LIMIT 100;

-- مزامنة أرصدة العملاء المدينون
UPDATE accounts 
SET balance = calculate_accounts_receivable_from_orders(),
    updated_at = now()
WHERE account_name = 'العملاء المدينون';