-- Create sequence for order numbers if not exists
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq
    INCREMENT 1
    MINVALUE 1
    START 1
    CACHE 1;

-- Create function to generate an order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq BIGINT;
  new_number TEXT;
BEGIN
  -- Get next sequence value
  SELECT nextval('public.order_number_seq') INTO seq;

  -- Build order number like ORD-YYYYMMDD-00001
  new_number := 'ORD-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad(seq::text, 5, '0');

  RETURN new_number;
END;
$$;

-- Grant execute permissions so PostgREST can expose it to anon/authenticated
GRANT EXECUTE ON FUNCTION public.generate_order_number() TO anon, authenticated;