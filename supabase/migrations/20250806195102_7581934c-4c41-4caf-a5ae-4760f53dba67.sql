-- إضافة order_ready_for_delivery إلى webhook لوحة الموظف
UPDATE webhook_settings 
SET order_statuses = array['order_updated', 'order_in_progress', 'order_completed', 'order_created', 'order_cancelled', 'order_ready_for_delivery', 'order_under_review', 'order_confirmed']
WHERE webhook_name = 'لوحة الموظف ';