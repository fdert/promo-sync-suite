-- إضافة قوالب رسائل واتساب للحالات المفقودة
INSERT INTO message_templates (template_name, template_type, template_content, is_active) VALUES
('order_cancelled', 'order_cancelled', 'عذراً {{customer_name}} 😔

تم إلغاء طلبك رقم {{order_number}}

📋 *تفاصيل الطلب الملغي:*
الخدمة: {{service_name}}
المبلغ: {{amount}} ر.س

إذا كان لديك أي استفسار، يرجى التواصل معنا.

نعتذر عن أي إزعاج قد يكون سببناه لك. 🙏', true),

('order_on_hold', 'order_on_hold', 'مرحباً {{customer_name}} ⏸️

تم تعليق طلبك رقم {{order_number}} مؤقتاً

📋 *تفاصيل الطلب:*
الخدمة: {{service_name}}
الوصف: {{description}}
المبلغ: {{amount}} ر.س

سيتم التواصل معك قريباً لحل أي مشكلة والمتابعة.

شكراً لصبرك وتفهمك! 🙏', true),

('order_status_updated', 'order_status_updated', 'مرحباً {{customer_name}} 📄

تم تحديث حالة طلبك رقم {{order_number}}

📋 *الحالة الجديدة:* {{status}}
الخدمة: {{service_name}}
المبلغ: {{amount}} ر.س

شكراً لثقتك بخدماتنا! 🙏', true),

('order_confirmed', 'order_confirmed', 'مرحباً {{customer_name}}! ✅

تم تأكيد طلبك رقم {{order_number}} وسيبدأ العمل عليه قريباً!

📋 *تفاصيل الطلب:*
الخدمة: {{service_name}}
الوصف: {{description}}
المبلغ: {{amount}} ر.س
المدفوع: {{paid_amount}} ر.س

📅 موعد التسليم المتوقع: {{due_date}}

سيتم إعلامك عند بدء العمل. شكراً لثقتك! 🚀', true)

ON CONFLICT (template_name) DO UPDATE SET
template_content = EXCLUDED.template_content,
updated_at = NOW();