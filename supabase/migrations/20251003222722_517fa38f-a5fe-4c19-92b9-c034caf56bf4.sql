-- تحديث القيم الحالية في جدول orders من الإنجليزية إلى العربية
UPDATE public.orders 
SET status = CASE 
  WHEN status = 'pending' THEN 'قيد الانتظار'::order_status
  WHEN status = 'in_progress' THEN 'قيد التنفيذ'::order_status
  WHEN status = 'completed' THEN 'مكتمل'::order_status
  WHEN status = 'cancelled' THEN 'ملغي'::order_status
  ELSE status
END
WHERE status IN ('pending', 'in_progress', 'completed', 'cancelled');