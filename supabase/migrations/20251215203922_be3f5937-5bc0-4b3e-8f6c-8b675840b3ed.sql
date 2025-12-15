-- إنشاء جدول الفواتير الخاصة
CREATE TABLE public.special_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC DEFAULT 15,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول بنود الفواتير الخاصة
CREATE TABLE public.special_invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.special_invoices(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.special_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_invoice_items ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
CREATE POLICY "Authenticated users can manage special invoices"
ON public.special_invoices FOR ALL USING (true);

CREATE POLICY "Authenticated users can view special invoices"
ON public.special_invoices FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage special invoice items"
ON public.special_invoice_items FOR ALL USING (true);

CREATE POLICY "Authenticated users can view special invoice items"
ON public.special_invoice_items FOR SELECT USING (true);

-- إنشاء دالة لتوليد رقم فاتورة خاصة فريد
CREATE OR REPLACE FUNCTION generate_special_invoice_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  max_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 4) AS INTEGER)), 0) + 1
  INTO max_number
  FROM special_invoices
  WHERE invoice_number LIKE 'SP-%';
  
  new_number := 'SP-' || LPAD(max_number::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;