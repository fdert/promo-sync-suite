-- إصلاح دالة generate_order_number لحل مشكلة التعارض في أسماء الأعمدة
CREATE OR REPLACE FUNCTION public.generate_order_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_number INTEGER;
  new_order_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(orders.order_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.orders
  WHERE orders.order_number ~ '^ORD-[0-9]+$';
  
  new_order_number := 'ORD-' || LPAD(next_number::TEXT, 3, '0');
  RETURN new_order_number;
END;
$function$