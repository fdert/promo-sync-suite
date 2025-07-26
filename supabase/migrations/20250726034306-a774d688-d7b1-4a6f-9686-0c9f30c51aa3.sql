-- حذف الفواتير المكررة (الاحتفاظ بأول فاتورة لكل طلب)
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY created_at) as rn
  FROM public.invoices 
  WHERE order_id IS NOT NULL
)
DELETE FROM public.invoices 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- إنشاء index فريد لمنع تكرار الفواتير لنفس الطلب
CREATE UNIQUE INDEX unique_invoice_per_order 
ON public.invoices (order_id) 
WHERE order_id IS NOT NULL;

-- إنشاء جدول الحسابات والإيرادات
CREATE TABLE public.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('إيرادات', 'مصروفات', 'أصول', 'خصوم', 'حقوق ملكية')),
  description text,
  balance numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- تمكين RLS للحسابات
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان للحسابات
CREATE POLICY "المدراء والمحاسبون يمكنهم إدارة الحسابات"
ON public.accounts
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

-- إنشاء جدول قيود الحسابات
CREATE TABLE public.account_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  reference_type text NOT NULL CHECK (reference_type IN ('فاتورة', 'مصروف', 'دفعة', 'تسوية', 'أخرى')),
  reference_id uuid,
  description text NOT NULL,
  debit_amount numeric DEFAULT 0,
  credit_amount numeric DEFAULT 0,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- تمكين RLS لقيود الحسابات
ALTER TABLE public.account_entries ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان لقيود الحسابات
CREATE POLICY "المدراء والمحاسبون يمكنهم إدارة قيود الحسابات"
ON public.account_entries
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

-- إدراج بعض الحسابات الأساسية
INSERT INTO public.accounts (account_name, account_type, description) VALUES
('إيرادات المبيعات', 'إيرادات', 'إيرادات من بيع الخدمات والمنتجات'),
('العملاء المدينون', 'أصول', 'المبالغ المستحقة من العملاء'),
('النقدية', 'أصول', 'النقد في الصندوق والبنك'),
('مصروفات التشغيل', 'مصروفات', 'مصروفات عامة للشركة');