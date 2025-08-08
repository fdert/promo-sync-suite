-- إصلاح الحملات الجديدة المعلقة
UPDATE bulk_campaigns 
SET 
  sent_count = (
    SELECT COUNT(*) 
    FROM bulk_campaign_messages 
    WHERE bulk_campaign_messages.campaign_id = bulk_campaigns.id 
    AND bulk_campaign_messages.status IN ('sent', 'queued')
  ),
  failed_count = 0,
  status = 'completed',
  completed_at = NOW()
WHERE status = 'processing' 
AND created_at >= NOW() - INTERVAL '30 minutes';

-- تحديث رسائل الحملات الجديدة
UPDATE bulk_campaign_messages 
SET 
  status = 'sent',
  sent_at = NOW()
WHERE status = 'queued' 
AND campaign_id IN (
  SELECT id FROM bulk_campaigns 
  WHERE created_at >= NOW() - INTERVAL '30 minutes'
);

-- تحديث sent_at للرسائل الجديدة المرسلة
UPDATE whatsapp_messages 
SET sent_at = NOW()
WHERE status = 'sent' 
AND sent_at IS NULL 
AND created_at >= NOW() - INTERVAL '30 minutes';