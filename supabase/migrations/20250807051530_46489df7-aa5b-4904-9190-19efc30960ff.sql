-- إصلاح view customer_outstanding_balances ليحسب من الطلبات بدلاً من الفواتير
DROP VIEW IF EXISTS customer_outstanding_balances;

CREATE VIEW customer_outstanding_balances AS
SELECT 
    c.id as customer_id,
    c.name as customer_name,
    COALESCE(order_summary.outstanding_balance, 0) as outstanding_balance,
    COALESCE(order_summary.unpaid_orders_count, 0) as unpaid_invoices_count,
    order_summary.earliest_due_date,
    order_summary.latest_due_date
FROM customers c
LEFT JOIN (
    SELECT 
        ops.customer_id,
        SUM(ops.remaining_amount) as outstanding_balance,
        COUNT(*) as unpaid_orders_count,
        MIN(ops.due_date) as earliest_due_date,
        MAX(ops.due_date) as latest_due_date
    FROM order_payment_summary ops
    WHERE ops.remaining_amount > 0
    GROUP BY ops.customer_id
) order_summary ON order_summary.customer_id = c.id
WHERE COALESCE(order_summary.outstanding_balance, 0) > 0;