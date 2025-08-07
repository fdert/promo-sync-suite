-- تحديث رقم الواتساب للعميل محمد جعفر
UPDATE customers 
SET whatsapp_number = phone 
WHERE id = '6df396e3-d1b2-4c08-b5d2-3c133a5c62fc' AND whatsapp_number IS NULL;