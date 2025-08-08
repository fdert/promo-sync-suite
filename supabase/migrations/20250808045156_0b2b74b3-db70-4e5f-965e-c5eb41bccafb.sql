-- إضافة القيم المفقودة لـ status في bulk_campaigns
ALTER TABLE bulk_campaigns DROP CONSTRAINT IF EXISTS bulk_campaigns_status_check;

ALTER TABLE bulk_campaigns ADD CONSTRAINT bulk_campaigns_status_check 
CHECK (status IN ('draft', 'sending', 'completed', 'failed', 'processing', 'cancelled'));

-- تصحيح حالة الحملة المعلقة
UPDATE bulk_campaigns 
SET status = 'draft', 
    error_message = NULL,
    completed_at = NULL
WHERE id = 'a06aeead-8b16-451d-a6fb-ed89cbfbab8b';