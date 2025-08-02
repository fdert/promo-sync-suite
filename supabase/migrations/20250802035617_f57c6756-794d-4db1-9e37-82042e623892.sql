-- إنشاء جدول مواد الطباعة
CREATE TABLE public.print_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_name TEXT NOT NULL,
  material_type TEXT NOT NULL, -- بلاستيك، ورق، فينيل، إلخ
  cost_per_unit NUMERIC(10,2) DEFAULT 0,
  unit_type TEXT DEFAULT 'متر مربع', -- متر مربع، قطعة، إلخ
  color TEXT,
  thickness TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول طلبات الطباعة
CREATE TABLE public.print_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  print_order_number TEXT UNIQUE NOT NULL DEFAULT ('PRT-' || LPAD(nextval('print_order_seq'::regclass)::TEXT, 3, '0')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_design', 'design_completed', 'ready_for_print', 'printing', 'printed', 'quality_check', 'completed', 'cancelled')),
  dimensions_width NUMERIC(10,2), -- العرض
  dimensions_height NUMERIC(10,2), -- الارتفاع
  dimensions_depth NUMERIC(10,2), -- العمق (إذا كان ثلاثي الأبعاد)
  quantity INTEGER DEFAULT 1,
  material_id UUID REFERENCES public.print_materials(id),
  additional_materials JSONB, -- مواد إضافية
  print_type TEXT, -- نوع الطباعة: ديجيتال، أوفست، إلخ
  finishing_type TEXT, -- نوع التشطيب: لامع، مات، إلخ
  design_notes TEXT,
  printing_notes TEXT,
  estimated_cost NUMERIC(10,2) DEFAULT 0,
  actual_cost NUMERIC(10,2) DEFAULT 0,
  design_started_at TIMESTAMP WITH TIME ZONE,
  design_completed_at TIMESTAMP WITH TIME ZONE,
  print_started_at TIMESTAMP WITH TIME ZONE,
  print_completed_at TIMESTAMP WITH TIME ZONE,
  quality_check_at TIMESTAMP WITH TIME ZONE,
  delivery_date TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول ملفات الطباعة
CREATE TABLE public.print_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  print_order_id UUID NOT NULL REFERENCES public.print_orders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL, -- design, proof, final, reference
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_approved BOOLEAN DEFAULT false,
  approval_date TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  version_number INTEGER DEFAULT 1,
  notes TEXT
);

-- إنشاء جدول تتبع مراحل الطباعة
CREATE TABLE public.print_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  print_order_id UUID NOT NULL REFERENCES public.print_orders(id) ON DELETE CASCADE,
  stage TEXT NOT NULL, -- design_start, design_complete, print_start, etc.
  status TEXT NOT NULL,
  notes TEXT,
  duration_minutes INTEGER, -- مدة المرحلة بالدقائق
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء sequence لأرقام طلبات الطباعة
CREATE SEQUENCE IF NOT EXISTS print_order_seq START 1;

-- تفعيل RLS
ALTER TABLE public.print_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_tracking ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للمواد
CREATE POLICY "المستخدمون يمكنهم عرض المواد" ON public.print_materials FOR SELECT USING (true);
CREATE POLICY "الإدارة يمكنها إدارة المواد" ON public.print_materials FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
);

-- سياسات الأمان لطلبات الطباعة
CREATE POLICY "المستخدمون يمكنهم عرض طلباتهم" ON public.print_orders FOR SELECT USING (
  created_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'employee'))
);

CREATE POLICY "المستخدمون يمكنهم إنشاء طلبات" ON public.print_orders FOR INSERT WITH CHECK (
  created_by = auth.uid()
);

CREATE POLICY "الإدارة والموظفون يمكنهم تحديث الطلبات" ON public.print_orders FOR UPDATE USING (
  created_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'employee'))
);

-- سياسات الأمان لملفات الطباعة
CREATE POLICY "المستخدمون يمكنهم عرض ملفاتهم" ON public.print_files FOR SELECT USING (
  uploaded_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'employee'))
);

CREATE POLICY "المستخدمون يمكنهم رفع الملفات" ON public.print_files FOR INSERT WITH CHECK (
  uploaded_by = auth.uid()
);

CREATE POLICY "الإدارة يمكنها إدارة الملفات" ON public.print_files FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'employee'))
);

-- سياسات الأمان لتتبع المراحل
CREATE POLICY "المستخدمون يمكنهم عرض تتبع طلباتهم" ON public.print_tracking FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM print_orders po 
    WHERE po.id = print_order_id AND (
      po.created_by = auth.uid() OR 
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'employee'))
    )
  )
);

CREATE POLICY "الموظفون يمكنهم إضافة تتبع" ON public.print_tracking FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'employee'))
);

-- إنشاء دالة لإنشاء طلب طباعة عند اكتمال الطلب
CREATE OR REPLACE FUNCTION create_print_order_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- عندما يتم تحديث حالة الطلب إلى "مكتمل" ولم يكن كذلك من قبل
  IF NEW.status = 'مكتمل' AND OLD.status != 'مكتمل' THEN
    -- التحقق من عدم وجود طلب طباعة مسبق
    IF NOT EXISTS (SELECT 1 FROM print_orders WHERE order_id = NEW.id) THEN
      INSERT INTO print_orders (
        order_id,
        status,
        quantity,
        design_notes,
        created_by,
        updated_by
      ) VALUES (
        NEW.id,
        'design_completed',
        1,
        'تم إنشاء طلب الطباعة تلقائياً عند اكتمال الطلب',
        NEW.created_by,
        NEW.created_by
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لإنشاء طلب الطباعة
CREATE TRIGGER create_print_order_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION create_print_order_on_completion();

-- إنشاء دالة لتحديث updated_at
CREATE TRIGGER update_print_materials_updated_at
  BEFORE UPDATE ON public.print_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_print_orders_updated_at
  BEFORE UPDATE ON public.print_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- إضافة مواد أساسية للطباعة
INSERT INTO public.print_materials (material_name, material_type, cost_per_unit, unit_type, color) VALUES
('ورق لامع 300 جرام', 'ورق', 15.00, 'متر مربع', 'أبيض'),
('فينيل شفاف', 'فينيل', 25.00, 'متر مربع', 'شفاف'),
('فينيل أبيض', 'فينيل', 20.00, 'متر مربع', 'أبيض'),
('فوم بورد 5 مم', 'فوم', 35.00, 'متر مربع', 'أبيض'),
('أكريليك شفاف 3 مم', 'أكريليك', 80.00, 'متر مربع', 'شفاف'),
('بانر فليكس', 'بانر', 12.00, 'متر مربع', 'أبيض'),
('ورق عادي A4', 'ورق', 0.50, 'ورقة', 'أبيض');

-- إنشاء bucket للملفات إذا لم يكن موجوداً
INSERT INTO storage.buckets (id, name, public) 
VALUES ('print-files', 'print-files', false)
ON CONFLICT (id) DO NOTHING;

-- سياسات التخزين
CREATE POLICY "المستخدمون يمكنهم رفع ملفاتهم" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'print-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "المستخدمون يمكنهم عرض ملفاتهم" ON storage.objects 
FOR SELECT USING (
  bucket_id = 'print-files' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR 
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'employee'))
  )
);

CREATE POLICY "الإدارة يمكنها إدارة جميع الملفات" ON storage.objects 
FOR ALL USING (
  bucket_id = 'print-files' AND 
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
);