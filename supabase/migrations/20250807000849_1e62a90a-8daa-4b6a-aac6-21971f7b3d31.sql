-- إعادة تشغيل رسائل التقييم المعلقة
UPDATE whatsapp_messages 
SET status = 'pending' 
WHERE message_content LIKE '%search.google.com%' 
AND status = 'sent' 
AND created_at > NOW() - INTERVAL '1 hour';