-- إضافة دور الإدارة العامة للنظام
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';