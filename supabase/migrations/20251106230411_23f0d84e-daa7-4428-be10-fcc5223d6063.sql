-- إنشاء قالب رسالة "طلب مكتمل" مع رابط التقييم
INSERT INTO message_templates (name, content, is_active, variables) 
VALUES (
  'order_completed',
  '🎉 تم إكمال طلبك بنجاح!

مرحباً {{customer_name}}،

✅ تم اكتمال طلبك رقم: {{order_number}}
📦 الخدمة: {{service_name}}

📊 الملخص المالي:
• قيمة الطلب: {{amount}} ر.س
• المدفوع: {{paid_amount}} ر.س
• المتبقي: {{remaining_amount}} ر.س

💰 الدفعات:
{{payments_details}}

⭐ تقييمك يهمنا!
نرجو تقييم تجربتك معنا عبر الرابط التالي:
{{evaluation_link}}

🔢 رمز التقييم: {{evaluation_code}}

شاكرين تعاملك معنا
{{company_name}}',
  true,
  '["customer_name", "order_number", "service_name", "amount", "paid_amount", "remaining_amount", "payments_details", "evaluation_link", "evaluation_code", "company_name"]'::jsonb
)
ON CONFLICT DO NOTHING;