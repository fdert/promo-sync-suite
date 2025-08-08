-- إصلاح الرسالة التي تم وضع علامة sent عليها لكن لم يتم إرسالها فعلياً
UPDATE whatsapp_messages 
SET status = 'pending', sent_at = NULL, updated_at = NOW()
WHERE status = 'sent'
AND sent_at IS NULL
AND created_at >= NOW() - INTERVAL '1 hour';