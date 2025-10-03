-- إضافة عمود طريقة الدفع والملاحظات إلى جدول المصروفات
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS notes text;