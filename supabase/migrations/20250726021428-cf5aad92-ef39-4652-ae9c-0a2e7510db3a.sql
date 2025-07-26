-- إنشاء جدول بنود الطلبات
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- إنشاء السياسات
CREATE POLICY "المدراء والموظفون يمكنهم رؤية جميع بنود الطلبات" 
ON public.order_items 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "المدراء والموظفون يمكنهم إضافة بنود طلبات" 
ON public.order_items 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "المدراء والموظفون يمكنهم تحديث بنود الطلبات" 
ON public.order_items 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "المدراء فقط يمكنهم حذف بنود الطلبات" 
ON public.order_items 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- إضافة تريجر للتحديث التلقائي لوقت التعديل
CREATE TRIGGER update_order_items_updated_at
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();