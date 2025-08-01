-- تفعيل الويب هوك النشط
UPDATE webhook_settings 
SET is_active = true, 
    order_statuses = ARRAY['order_created', 'order_confirmed', 'order_in_progress', 'order_under_review', 'order_completed', 'order_cancelled', 'order_on_hold', 'order_ready_for_delivery', 'order_status_updated']
WHERE webhook_name = 'طلب جديد الاخير';