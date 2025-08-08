-- إعادة تعيين الرسائل المُرسلة بدون sent_at إلى pending
UPDATE whatsapp_messages 
SET status = 'pending' 
WHERE status = 'sent' AND sent_at IS NULL;