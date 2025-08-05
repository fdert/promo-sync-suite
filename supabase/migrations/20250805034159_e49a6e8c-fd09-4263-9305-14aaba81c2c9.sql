-- إضافة قالب للطلب قيد المراجعة
INSERT INTO message_templates (template_name, template_content, template_type, is_active)
VALUES (
  'order_under_review',
  'مرحباً {{customer_name}}! 📋

🔍 *طلبك قيد المراجعة*

📋 *تفاصيل الطلب:*
رقم الطلب: {{order_number}}
الخدمة: {{service_name}}
الوصف: {{description}}

💰 *المعلومات المالية:*
إجمالي المبلغ: {{amount}} ر.س
المبلغ المدفوع: {{paid_amount}} ر.س

📋 *بنود الطلب:*
{{order_items}}

⏱️ سيتم مراجعة جميع التفاصيل والتواصل معك قريباً لتأكيد الخطوات التالية.

شكراً لصبرك وتفهمك! 🙏

{{company_name}}',
  'order',
  true
)
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates WHERE template_name = 'order_under_review'
);

-- تحديث قالب البروفة الجاهزة
UPDATE message_templates 
SET template_content = '🎨 بروفة التصميم جاهزة للمراجعة

📋 تفاصيل الطلب:
* رقم الطلب: {{order_number}}
* العميل: {{customer_name}}
* الخدمة: {{service_name}}

📋 بنود الطلب:
{{order_items}}

📊 إجمالي البنود: {{amount}} ر.س


📸 *رابط البروفة للعرض والتحميل:*
🔗 اضغط هنا لفتح البروفة:
{{proof_url}}

📱 *أو انسخ الرابط في المتصفح:*
{{proof_url}}

بعد مراجعة البروفة:

✅ للموافقة: أرسل "موافق"
📝 للتعديل: اكتب التعديلات المطلوبة

شكراً لكم،
{{company_name}}'
WHERE template_name = 'design_proof_ready';