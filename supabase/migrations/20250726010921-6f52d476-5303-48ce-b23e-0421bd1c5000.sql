-- Check current constraint and add webhook type
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new constraint that includes webhook type
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('info', 'warning', 'error', 'success', 'webhook'));