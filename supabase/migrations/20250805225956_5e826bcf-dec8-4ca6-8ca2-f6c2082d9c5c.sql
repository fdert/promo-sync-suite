-- تحديث قالب "تحديث الحالة العام" لعرض الحالة بشكل صحيح
UPDATE message_templates 
SET template_content = 'مرحباً {{customer_name}}! 🔄

📝 *حالة طلبكم: {{status}}*

📋 *تفاصيل الطلب:*
رقم الطلب: {{order_number}}
الخدمة: {{service_name}}
الوصف: {{description}}

💰 *المعلومات المالية:*
إجمالي المبلغ: {{amount}} ر.س
المبلغ المدفوع: {{paid_amount}} ر.س
المبلغ المتبقي: {{remaining_amount}} ر.س

📦 *بنود الطلب:*
{{order_items}}

📅 تاريخ التسليم: {{due_date}}

سنبقيك على اطلاع بأي تطورات جديدة! 📲

نشكرك لثقتك الغالية بخدماتنا ونتطلع لخدمتك مرة أخرى! 💕

{{company_name}}'
WHERE template_name = 'order_status_updated';

-- إضافة قالب لحالة "مؤكد" إذا لم يكن موجود
INSERT INTO message_templates (template_name, template_content, template_type, is_active)
SELECT 
  'order_confirmed',
  'مرحباً {{customer_name}}! ✅

✨ *تم تأكيد طلبك بنجاح!*

📋 *تفاصيل الطلب:*
رقم الطلب: {{order_number}}
الخدمة: {{service_name}}
الوصف: {{description}}

💰 *المعلومات المالية:*
إجمالي المبلغ: {{amount}} ر.س
المبلغ المدفوع: {{paid_amount}} ر.س

📋 *بنود الطلب:*
{{order_items}}

📅 تاريخ التسليم المتوقع: {{due_date}}

سيبدأ فريقنا بالعمل على طلبك قريباً. شكراً لثقتك! 💪

{{company_name}}',
  'order',
  true
WHERE NOT EXISTS (SELECT 1 FROM message_templates WHERE template_name = 'order_confirmed');