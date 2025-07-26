-- Add order_statuses column to webhook_settings table
ALTER TABLE public.webhook_settings 
ADD COLUMN order_statuses TEXT[];

-- Add comment to describe the column
COMMENT ON COLUMN public.webhook_settings.order_statuses IS 'Array of order statuses for which this webhook should be triggered';