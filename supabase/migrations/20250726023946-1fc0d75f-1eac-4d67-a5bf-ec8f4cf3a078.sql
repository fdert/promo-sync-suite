-- إصلاح دالة توليد رقم الفاتورة لحل مشكلة التضارب في أسماء الأعمدة
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_number INTEGER;
  new_invoice_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoices.invoice_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.invoices
  WHERE invoices.invoice_number ~ '^INV-[0-9]+$';
  
  new_invoice_number := 'INV-' || LPAD(next_number::TEXT, 3, '0');
  RETURN new_invoice_number;
END;
$$;