-- Test notification by updating order status to trigger the notification system
-- First let's manually create a test message to see if the webhook system works

-- Create a test WhatsApp message for the customer
INSERT INTO whatsapp_messages (
  from_number,
  to_number,
  message_type,
  message_content,
  status,
  customer_id,
  created_at
) VALUES (
  'system',
  '+966555319789',
  'text',
  'اختبار - مرحباً مذهلة! 🚀

⚙️ *بدء العمل على طلبك!*

📋 *تفاصيل الطلب:*
رقم الطلب: ORD-051
الخدمة: عبار قص بلوتر بدون تركيب 
الوصف: عبارة قص بلوتر باسم تمايم راكان بن مسعود مقاس 30 سم
الحالة: قيد التنفيذ

💰 *المعلومات المالية:*
إجمالي المبلغ: 20 ر.س
المبلغ المدفوع: 0 ر.س

📅 تاريخ التسليم المتوقع: 13/2/1447 هـ

سيتم إعلامك عند انتهاء كل مرحلة من مراحل العمل. شكراً لثقتك! 💪

وكالة الإبداع للدعاية والإعلان',
  'pending',
  '1398be49-3cce-4229-a3d0-22e275455731',
  now()
);