-- إضافة عمود description المفقود في جدول agencies
ALTER TABLE public.agencies 
ADD COLUMN IF NOT EXISTS description TEXT;