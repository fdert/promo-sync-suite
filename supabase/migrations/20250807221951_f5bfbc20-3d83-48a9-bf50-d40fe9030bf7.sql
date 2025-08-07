-- تصحيح مبلغ الطلب للعميل شهد
UPDATE orders 
SET amount = 50 
WHERE order_number = 'ORD-030' 
AND customer_id = (
  SELECT id FROM customers WHERE name ILIKE '%شهد%' LIMIT 1
);