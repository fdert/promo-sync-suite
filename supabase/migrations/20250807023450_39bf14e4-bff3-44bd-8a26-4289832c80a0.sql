-- إنشاء جدول إعدادات الملصق
CREATE TABLE public.barcode_label_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label_width NUMERIC NOT NULL DEFAULT 80, -- عرض الملصق بالمليمتر
  label_height NUMERIC DEFAULT NULL, -- ارتفاع الملصق (NULL للارتفاع التلقائي)
  paper_type TEXT NOT NULL DEFAULT 'thermal-80mm', -- نوع الورق
  margins NUMERIC NOT NULL DEFAULT 2, -- الهوامش بالمليمتر
  barcode_height NUMERIC NOT NULL DEFAULT 50, -- ارتفاع الباركود بالبكسل
  barcode_width NUMERIC NOT NULL DEFAULT 2, -- عرض خطوط الباركود
  font_size NUMERIC NOT NULL DEFAULT 12, -- حجم الخط
  show_company_logo BOOLEAN NOT NULL DEFAULT true, -- إظهار شعار الشركة
  show_company_name BOOLEAN NOT NULL DEFAULT true, -- إظهار اسم الشركة
  show_date BOOLEAN NOT NULL DEFAULT true, -- إظهار التاريخ
  show_qr_code BOOLEAN NOT NULL DEFAULT false, -- إظهار كود QR إضافي
  company_logo_url TEXT DEFAULT NULL, -- رابط شعار الشركة
  company_name TEXT DEFAULT 'وكالة الإبداع للدعاية والإعلان', -- اسم الشركة
  company_phone TEXT DEFAULT NULL, -- رقم هاتف الشركة
  company_address TEXT DEFAULT NULL, -- عنوان الشركة
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.barcode_label_settings ENABLE ROW LEVEL SECURITY;

-- إنشاء السياسات
CREATE POLICY "المدراء يمكنهم إدارة إعدادات الملصق" 
ON public.barcode_label_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "الموظفون يمكنهم رؤية إعدادات الملصق" 
ON public.barcode_label_settings 
FOR SELECT 
USING (is_active = true);

-- إدراج إعدادات افتراضية
INSERT INTO public.barcode_label_settings (
  label_width,
  label_height,
  paper_type,
  margins,
  barcode_height,
  barcode_width,
  font_size,
  show_company_logo,
  show_company_name,
  show_date,
  company_name,
  is_active
) VALUES (
  80,
  NULL,
  'thermal-80mm',
  2,
  50,
  2,
  12,
  true,
  true,
  true,
  'وكالة الإبداع للدعاية والإعلان',
  true
);

-- إنشاء trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_barcode_label_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_barcode_label_settings_updated_at
  BEFORE UPDATE ON public.barcode_label_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_barcode_label_settings_updated_at();