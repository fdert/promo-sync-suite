-- إنشاء جدول سجل النشاطات
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول المصروفات
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_number TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  receipt_url TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- إنشاء جدول النسخ الاحتياطية
CREATE TABLE public.backups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_name TEXT NOT NULL,
  backup_type TEXT NOT NULL DEFAULT 'manual',
  file_size BIGINT,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- إنشاء جدول استيراد البيانات
CREATE TABLE public.data_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error_log JSONB,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- تحديث جدول الفواتير لإضافة ميزات جديدة
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS is_deferred BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS print_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_printed_at TIMESTAMP WITH TIME ZONE;

-- تحديث جدول العملاء لإضافة ميزات جديدة  
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS import_source TEXT,
ADD COLUMN IF NOT EXISTS last_invoice_date DATE;

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

CREATE INDEX IF NOT EXISTS idx_invoices_is_deferred ON public.invoices(is_deferred);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);

-- تمكين RLS على الجداول الجديدة
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_imports ENABLE ROW LEVEL SECURITY;

-- سياسات RLS لجدول سجل النشاطات
CREATE POLICY "المدراء يمكنهم رؤية جميع السجلات" 
ON public.activity_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "المستخدمون يمكنهم رؤية نشاطاتهم" 
ON public.activity_logs 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "النظام يمكنه إضافة السجلات" 
ON public.activity_logs 
FOR INSERT 
WITH CHECK (true);

-- سياسات RLS لجدول المصروفات
CREATE POLICY "المدراء والمحاسبون يمكنهم إدارة المصروفات" 
ON public.expenses 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'accountant')
);

-- سياسات RLS لجدول النسخ الاحتياطية
CREATE POLICY "المدراء فقط يمكنهم إدارة النسخ الاحتياطية" 
ON public.backups 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- سياسات RLS لجدول استيراد البيانات
CREATE POLICY "المدراء والموظفون يمكنهم رؤية الاستيراد" 
ON public.data_imports 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'employee')
);

CREATE POLICY "المدراء فقط يمكنهم إنشاء استيراد" 
ON public.data_imports 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- إنشاء دالة لتوليد رقم المصروف
CREATE OR REPLACE FUNCTION public.generate_expense_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_number INTEGER;
  expense_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(expense_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.expenses
  WHERE expense_number ~ '^EXP-[0-9]+$';
  
  expense_number := 'EXP-' || LPAD(next_number::TEXT, 3, '0');
  RETURN expense_number;
END;
$$;

-- إنشاء دالة لتسجيل النشاطات
CREATE OR REPLACE FUNCTION public.log_activity(
  _user_id UUID,
  _action TEXT,
  _resource_type TEXT,
  _resource_id TEXT DEFAULT NULL,
  _details JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.activity_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    _user_id,
    _action,
    _resource_type,
    _resource_id,
    _details
  );
END;
$$;

-- إنشاء trigger لتحديث updated_at في جدول المصروفات
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();