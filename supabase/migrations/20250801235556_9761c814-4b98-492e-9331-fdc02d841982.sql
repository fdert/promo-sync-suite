-- التأكد من وجود القوالب الأساسية لإشعارات الطلبات
INSERT INTO message_templates (template_name, template_content, template_type, is_active) 
VALUES 
('order_created', 'مرحباً {{customer_name}}! 🎉

تم إنشاء طلبك بنجاح! 

📋 *تفاصيل الطلب:*
رقم الطلب: {{order_number}}
الخدمة: {{service_name}}
الوصف: {{description}}

💰 *المعلومات المالية:*
إجمالي المبلغ: {{amount}} ر.س
المبلغ المدفوع: {{paid_amount}} ر.س

📅 تاريخ التسليم المتوقع: {{due_date}}

شكراً لثقتك بخدماتنا! سيتم التواصل معك قريباً 💪

{{company_name}}', 'order', true),

('order_confirmed', 'مرحباً {{customer_name}}! ✅

تم تأكيد طلبك رقم {{order_number}} وبدء العمل عليه!

📋 *تفاصيل الطلب:*
الخدمة: {{service_name}}
الوصف: {{description}}

⏰ الوقت المتوقع للإنجاز: {{estimated_time}}
📅 تاريخ التسليم: {{due_date}}

سنبقيك على اطلاع بتطورات العمل خطوة بخطوة! 🚀

{{company_name}}', 'order', true)

ON CONFLICT (template_name) DO UPDATE SET
  template_content = EXCLUDED.template_content,
  updated_at = now();