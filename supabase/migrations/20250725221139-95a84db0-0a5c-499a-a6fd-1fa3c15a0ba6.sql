-- إصلاح مشاكل الأمان - إضافة search_path للدوال
ALTER FUNCTION public.generate_order_number() SET search_path = 'public';
ALTER FUNCTION public.generate_invoice_number() SET search_path = 'public';