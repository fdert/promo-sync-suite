-- إصلاح إحصائيات الحملات الجماعية المعلقة
UPDATE bulk_campaigns 
SET 
  sent_count = (
    SELECT COUNT(*) 
    FROM bulk_campaign_messages 
    WHERE bulk_campaign_messages.campaign_id = bulk_campaigns.id 
    AND bulk_campaign_messages.status IN ('sent', 'queued')
  ),
  failed_count = (
    SELECT COUNT(*) 
    FROM bulk_campaign_messages 
    WHERE bulk_campaign_messages.campaign_id = bulk_campaigns.id 
    AND bulk_campaign_messages.status = 'failed'
  ),
  status = 'completed',
  completed_at = NOW()
WHERE status IN ('processing', 'sending') 
AND total_recipients > 0;

-- تحديث حالة رسائل الحملات إلى 'sent' للرسائل المرسلة بنجاح
UPDATE bulk_campaign_messages 
SET 
  status = 'sent',
  sent_at = NOW()
WHERE status = 'queued' 
AND customer_id IN (
  SELECT DISTINCT customer_id 
  FROM whatsapp_messages 
  WHERE status = 'sent' 
  AND sent_at IS NULL
  AND created_at >= NOW() - INTERVAL '24 hours'
);

-- تحديث sent_at للرسائل المرسلة في الواتساب
UPDATE whatsapp_messages 
SET sent_at = NOW()
WHERE status = 'sent' 
AND sent_at IS NULL 
AND created_at >= NOW() - INTERVAL '24 hours';