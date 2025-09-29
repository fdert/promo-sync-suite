-- Fix security definer views by recreating them without SECURITY DEFINER
-- This will make them use the permissions of the querying user

-- Drop and recreate views with SECURITY INVOKER
DROP VIEW IF EXISTS public.order_payment_summary CASCADE;
DROP VIEW IF EXISTS public.customer_order_balances CASCADE;
DROP VIEW IF EXISTS public.customer_outstanding_balances CASCADE;

CREATE VIEW public.order_payment_summary 
WITH (security_invoker = true) AS
SELECT 
  o.id as order_id,
  o.order_number,
  o.customer_id,
  c.name as customer_name,
  o.total_amount,
  COALESCE(SUM(p.amount), 0) as paid_amount,
  o.total_amount - COALESCE(SUM(p.amount), 0) as balance,
  o.status,
  o.created_at
FROM public.orders o
LEFT JOIN public.customers c ON o.customer_id = c.id
LEFT JOIN public.payments p ON p.order_id = o.id
GROUP BY o.id, o.order_number, o.customer_id, c.name, o.total_amount, o.status, o.created_at;

CREATE VIEW public.customer_order_balances 
WITH (security_invoker = true) AS
SELECT 
  c.id as customer_id,
  c.name as customer_name,
  COUNT(DISTINCT o.id) as total_orders,
  COALESCE(SUM(o.total_amount), 0) as total_amount,
  COALESCE(SUM(p.amount), 0) as paid_amount,
  COALESCE(SUM(o.total_amount), 0) - COALESCE(SUM(p.amount), 0) as balance
FROM public.customers c
LEFT JOIN public.orders o ON o.customer_id = c.id
LEFT JOIN public.payments p ON p.customer_id = c.id
GROUP BY c.id, c.name;

CREATE VIEW public.customer_outstanding_balances 
WITH (security_invoker = true) AS
SELECT 
  c.id as customer_id,
  c.name as customer_name,
  c.phone,
  c.whatsapp,
  COALESCE(SUM(o.total_amount - o.paid_amount), 0) as outstanding_balance
FROM public.customers c
LEFT JOIN public.orders o ON o.customer_id = c.id
WHERE o.status != 'cancelled'
GROUP BY c.id, c.name, c.phone, c.whatsapp
HAVING COALESCE(SUM(o.total_amount - o.paid_amount), 0) > 0;

-- Fix function search path using CREATE OR REPLACE (won't drop triggers)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;