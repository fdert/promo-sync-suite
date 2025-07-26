-- إضافة الأعمدة المفقودة لجدول الفواتير
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'دفع آجل';