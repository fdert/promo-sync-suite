-- Reset the test message to pending so it can be processed again
UPDATE whatsapp_messages 
SET status = 'pending', 
    created_at = now()
WHERE id = '0cb53e03-cf6e-49a0-bb88-b3f11a25d9df';