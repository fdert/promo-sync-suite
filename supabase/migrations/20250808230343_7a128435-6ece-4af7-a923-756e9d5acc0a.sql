-- Fix webhook settings to include all order statuses
UPDATE webhook_settings 
SET order_statuses = ARRAY[
  'order_created',
  'order_confirmed', 
  'order_in_progress',
  'order_under_review',
  'order_ready_for_delivery',
  'order_completed',
  'order_cancelled',
  'order_updated'
]
WHERE webhook_name = 'لوحة الموظف' AND webhook_type = 'outgoing';

-- Fix other webhook that's missing order_in_progress
UPDATE webhook_settings 
SET order_statuses = ARRAY[
  'order_created',
  'order_confirmed',
  'order_in_progress', 
  'order_under_review',
  'order_ready_for_delivery',
  'order_completed',
  'order_cancelled',
  'order_updated'
]
WHERE webhook_name = 'طلبات ابداع' AND webhook_type = 'outgoing';