-- إنشاء جدول بنود الفاتورة
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL NOT NULL DEFAULT 1,
  unit_price DECIMAL NOT NULL,
  total_amount DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات RLS
CREATE POLICY "المدراء والموظفون يمكنهم رؤية جميع بنود الفواتير" 
ON public.invoice_items 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "المدراء والموظفون يمكنهم إضافة بنود فواتير" 
ON public.invoice_items 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "المدراء والموظفون يمكنهم تحديث بنود الفواتير" 
ON public.invoice_items 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "المدراء فقط يمكنهم حذف بنود الفواتير" 
ON public.invoice_items 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- إنشاء trigger للتحديث التلقائي لتاريخ التعديل
CREATE TRIGGER update_invoice_items_updated_at
BEFORE UPDATE ON public.invoice_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();