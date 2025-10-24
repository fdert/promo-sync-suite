-- Update customers to set whatsapp = phone where whatsapp is null
UPDATE customers 
SET whatsapp = phone 
WHERE whatsapp IS NULL AND phone IS NOT NULL;