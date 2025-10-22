-- إنشاء جدول مواد الطباعة
CREATE TABLE IF NOT EXISTS public.print_materials (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  material_name TEXT NOT NULL,
  material_type TEXT NOT NULL,
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  unit_type TEXT NOT NULL DEFAULT 'متر',
  color TEXT,
  thickness TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول طلبات الطباعة
CREATE TABLE IF NOT EXISTS public.print_orders (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  print_order_number TEXT UNIQUE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.print_materials(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  dimensions_width NUMERIC,
  dimensions_height NUMERIC,
  dimensions_depth NUMERIC,
  quantity INTEGER NOT NULL DEFAULT 1,
  print_type TEXT,
  finishing_type TEXT,
  design_notes TEXT,
  printing_notes TEXT,
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  design_started_at TIMESTAMP WITH TIME ZONE,
  design_completed_at TIMESTAMP WITH TIME ZONE,
  print_started_at TIMESTAMP WITH TIME ZONE,
  print_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- إنشاء جدول ملفات الطباعة
CREATE TABLE IF NOT EXISTS public.print_files (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  print_order_id UUID REFERENCES public.print_orders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  mime_type TEXT,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id),
  is_approved BOOLEAN DEFAULT false,
  approval_date TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.print_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_files ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لجدول مواد الطباعة
CREATE POLICY "Authenticated users can view print materials"
  ON public.print_materials FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage print materials"
  ON public.print_materials FOR ALL
  TO authenticated
  USING (true);

-- سياسات الأمان لجدول طلبات الطباعة
CREATE POLICY "Authenticated users can view print orders"
  ON public.print_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage print orders"
  ON public.print_orders FOR ALL
  TO authenticated
  USING (true);

-- سياسات الأمان لجدول ملفات الطباعة
CREATE POLICY "Authenticated users can view print files"
  ON public.print_files FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage print files"
  ON public.print_files FOR ALL
  TO authenticated
  USING (true);

-- إنشاء trigger لتحديث updated_at
CREATE TRIGGER update_print_materials_updated_at
  BEFORE UPDATE ON public.print_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_print_orders_updated_at
  BEFORE UPDATE ON public.print_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- إنشاء دالة لتوليد رقم طلب طباعة
CREATE OR REPLACE FUNCTION public.generate_print_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq BIGINT;
  new_number TEXT;
BEGIN
  -- الحصول على آخر رقم
  SELECT COALESCE(MAX(CAST(SUBSTRING(print_order_number FROM '[0-9]+$') AS BIGINT)), 0) + 1
  INTO seq
  FROM public.print_orders
  WHERE print_order_number LIKE 'PRT-%';

  -- بناء رقم الطلب مثل PRT-00001
  new_number := 'PRT-' || lpad(seq::text, 5, '0');

  RETURN new_number;
END;
$$;

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_print_orders_order_id ON public.print_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_print_orders_status ON public.print_orders(status);
CREATE INDEX IF NOT EXISTS idx_print_files_print_order_id ON public.print_files(print_order_id);
CREATE INDEX IF NOT EXISTS idx_print_files_is_approved ON public.print_files(is_approved);