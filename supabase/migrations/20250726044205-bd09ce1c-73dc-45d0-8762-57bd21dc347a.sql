-- إضافة أو تحديث قالب رسالة إنشاء طلب جديد مع تفاصيل كاملة
INSERT INTO message_templates (template_name, template_content, template_type, is_active, created_by)
VALUES (
  'order_created',
  'مرحباً {{customer_name}}! 🎉

تم إنشاء طلبك بنجاح ✅

📋 *تفاصيل الطلب:*
رقم الطلب: {{order_number}}
الخدمة: {{service_name}}
الوصف: {{description}}

💰 *المعلومات المالية:*
إجمالي المبلغ: {{amount}} ر.س
المبلغ المدفوع: {{paid_amount}} ر.س
المبلغ المتبقي: {{remaining_amount}} ر.س
طريقة الدفع: {{payment_type}}

📦 *بنود الطلب:*
{{order_items}}

📅 *مواعيد مهمة:*
تاريخ بدء العمل: {{start_date}}
موعد التسليم المتوقع: {{due_date}}

حالة الطلب: {{status}}
الأولوية: {{priority}}

سيتم التواصل معك لتأكيد التفاصيل النهائية.
شكراً لثقتك بخدماتنا! 🙏',
  'notification',
  true,
  '00000000-0000-0000-0000-000000000000'
)
ON CONFLICT (template_name) DO UPDATE SET
  template_content = EXCLUDED.template_content,
  updated_at = now();