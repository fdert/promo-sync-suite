-- إعادة تعيين الرسائل التي أُرسلت بدون sent_at للمعالجة مرة أخرى
UPDATE whatsapp_messages 
SET status = 'pending', 
    sent_at = NULL,
    updated_at = now()
WHERE status = 'sent' 
  AND sent_at IS NULL 
  AND created_at >= '2025-08-08 04:50:00';