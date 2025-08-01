-- إضافة foreign key constraint بين whatsapp_messages وcustomers
ALTER TABLE public.whatsapp_messages 
ADD CONSTRAINT fk_whatsapp_messages_customer 
FOREIGN KEY (customer_id) 
REFERENCES public.customers(id) 
ON DELETE SET NULL;