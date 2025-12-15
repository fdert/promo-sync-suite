-- إصلاح دالة توليد رقم الفاتورة الخاصة بإضافة search_path
DROP FUNCTION IF EXISTS generate_special_invoice_number();

CREATE OR REPLACE FUNCTION public.generate_special_invoice_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  max_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 4) AS INTEGER)), 0) + 1
  INTO max_number
  FROM public.special_invoices
  WHERE invoice_number LIKE 'SP-%';
  
  new_number := 'SP-' || LPAD(max_number::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;