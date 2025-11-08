-- إضافة حقل الوقت التقريبي للتسليم في جدول الطلبات
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS estimated_delivery_time TEXT;