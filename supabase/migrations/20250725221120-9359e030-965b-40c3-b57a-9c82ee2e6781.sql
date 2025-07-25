-- إنشاء جدول العملاء
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  company TEXT,
  city TEXT,
  address TEXT,
  notes TEXT,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'نشط' CHECK (status IN ('نشط', 'غير نشط')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول الخدمات
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2),
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول الطلبات
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id),
  service_name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'جديد' CHECK (status IN ('جديد', 'قيد التنفيذ', 'قيد المراجعة', 'مكتمل', 'معلق', 'ملغي')),
  priority TEXT DEFAULT 'متوسطة' CHECK (priority IN ('عالية', 'متوسطة', 'منخفضة')),
  amount DECIMAL(10,2) NOT NULL,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date DATE,
  due_date DATE,
  completion_date DATE,
  assigned_to UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول الفواتير
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),
  amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'قيد الانتظار' CHECK (status IN ('قيد الانتظار', 'مدفوع', 'متأخر', 'ملغي')),
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  payment_date DATE,
  payment_method TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول الإشعارات
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- تمكين RLS على جميع الجداول
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للعملاء
CREATE POLICY "المدراء والموظفون يمكنهم رؤية جميع العملاء" 
ON public.customers FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "المدراء والموظفون يمكنهم إضافة عملاء" 
ON public.customers FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "المدراء والموظفون يمكنهم تحديث العملاء" 
ON public.customers FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "المدراء فقط يمكنهم حذف العملاء" 
ON public.customers FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- سياسات RLS للخدمات
CREATE POLICY "الجميع يمكنهم رؤية الخدمات النشطة" 
ON public.services FOR SELECT 
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "المدراء فقط يمكنهم إدارة الخدمات" 
ON public.services FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- سياسات RLS للطلبات
CREATE POLICY "المدراء والموظفون يمكنهم رؤية جميع الطلبات" 
ON public.orders FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "المدراء والموظفون يمكنهم إضافة طلبات" 
ON public.orders FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "المدراء والموظفون يمكنهم تحديث الطلبات" 
ON public.orders FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "المدراء فقط يمكنهم حذف الطلبات" 
ON public.orders FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- سياسات RLS للفواتير
CREATE POLICY "المدراء والموظفون يمكنهم رؤية جميع الفواتير" 
ON public.invoices FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "المدراء والموظفون يمكنهم إضافة فواتير" 
ON public.invoices FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "المدراء والموظفون يمكنهم تحديث الفواتير" 
ON public.invoices FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "المدراء فقط يمكنهم حذف الفواتير" 
ON public.invoices FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- سياسات RLS للإشعارات
CREATE POLICY "المستخدمون يمكنهم رؤية إشعاراتهم فقط" 
ON public.notifications FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "النظام يمكنه إضافة إشعارات" 
ON public.notifications FOR INSERT 
WITH CHECK (true);

CREATE POLICY "المستخدمون يمكنهم تحديث إشعاراتهم" 
ON public.notifications FOR UPDATE 
USING (user_id = auth.uid());

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX idx_customers_email ON public.customers(email);
CREATE INDEX idx_customers_status ON public.customers(status);
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_due_date ON public.orders(due_date);
CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);

-- إضافة triggers للتحديث التلقائي لـ updated_at
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- إنشاء دالة لتوليد أرقام الطلبات
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  order_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.orders
  WHERE order_number ~ '^ORD-[0-9]+$';
  
  order_number := 'ORD-' || LPAD(next_number::TEXT, 3, '0');
  RETURN order_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء دالة لتوليد أرقام الفواتير
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  invoice_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.invoices
  WHERE invoice_number ~ '^INV-[0-9]+$';
  
  invoice_number := 'INV-' || LPAD(next_number::TEXT, 3, '0');
  RETURN invoice_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;