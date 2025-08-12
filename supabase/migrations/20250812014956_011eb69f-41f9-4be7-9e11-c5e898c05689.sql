-- إنشاء دالة لتحديث بنود الطلب بشكل آمن
CREATE OR REPLACE FUNCTION public.update_order_items_safely(
  order_id_param uuid,
  items_data jsonb[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- حذف البنود القديمة
  DELETE FROM order_items WHERE order_id = order_id_param;
  
  -- إدراج البنود الجديدة إذا كانت موجودة
  IF array_length(items_data, 1) > 0 THEN
    INSERT INTO order_items (order_id, item_name, quantity, unit_price, total_amount)
    SELECT 
      order_id_param,
      (item->>'item_name')::text,
      (item->>'quantity')::numeric,
      (item->>'unit_price')::numeric,
      (item->>'total_amount')::numeric
    FROM unnest(items_data) AS item
    WHERE (item->>'item_name')::text IS NOT NULL 
    AND (item->>'item_name')::text != '';
  END IF;
END;
$$;

-- حذف البنود المكررة للطلب ORD-063
DELETE FROM order_items 
WHERE order_id = '5a158d9b-b3f8-4e5a-99a9-9472c44515c1' 
AND id NOT IN (
  SELECT DISTINCT ON (item_name, quantity, unit_price) id 
  FROM order_items 
  WHERE order_id = '5a158d9b-b3f8-4e5a-99a9-9472c44515c1' 
  ORDER BY item_name, quantity, unit_price, created_at ASC
);