-- إعادة تشغيل رسائل التقييم الحديثة التي لم ترسل فعلياً
UPDATE whatsapp_messages 
SET status = 'pending' 
WHERE id IN ('09865655-f91f-4538-a534-48e01402abc7', '952a2c6a-edbf-4468-8101-8a4ea96e799c')
AND status = 'sent';