-- إنشاء view لحساب أرصدة العملاء من الطلبات
CREATE OR REPLACE VIEW customer_order_balances AS
SELECT 
    c.id as customer_id,
    c.name as customer_name,
    COALESCE(SUM(o.amount), 0) as total_orders_amount,
    COALESCE(SUM(COALESCE(p.total_payments, 0)), 0) as total_paid_amount,
    COALESCE(SUM(o.amount), 0) - COALESCE(SUM(COALESCE(p.total_payments, 0)), 0) as outstanding_balance,
    COUNT(o.id) as total_orders_count,
    COUNT(CASE WHEN (o.amount - COALESCE(p.total_payments, 0)) > 0 THEN 1 END) as unpaid_orders_count,
    MIN(o.due_date) as earliest_due_date,
    MAX(o.due_date) as latest_due_date,
    MAX(o.created_at) as last_order_date
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
LEFT JOIN (
    SELECT 
        order_id,
        SUM(amount) as total_payments
    FROM payments 
    WHERE order_id IS NOT NULL
    GROUP BY order_id
) p ON o.id = p.order_id
GROUP BY c.id, c.name
HAVING COALESCE(SUM(o.amount), 0) - COALESCE(SUM(COALESCE(p.total_payments, 0)), 0) > 0
ORDER BY outstanding_balance DESC;

-- تحديث حساب العملاء المدينون بناءً على الطلبات
CREATE OR REPLACE FUNCTION calculate_accounts_receivable_from_orders()
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    total_outstanding NUMERIC := 0;
BEGIN
    -- حساب إجمالي الأرصدة المستحقة من الطلبات
    SELECT COALESCE(SUM(outstanding_balance), 0)
    INTO total_outstanding
    FROM customer_order_balances;
    
    RETURN total_outstanding;
END;
$$;