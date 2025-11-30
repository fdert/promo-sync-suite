-- إضافة قوالب رسائل الأقساط
INSERT INTO message_templates (name, content, is_active, variables) 
SELECT 'installment_plan_created', 
 '🎉 تم إنشاء خطة تقسيط لطلبك!

📋 رقم الطلب: {{order_number}}
💰 إجمالي المبلغ المتبقي: {{total_amount}}
📅 عدد الأقساط: {{number_of_installments}}

تفاصيل الأقساط:
{{installments_list}}

سيتم تذكيرك قبل كل دفعة بيومين وبيوم واحد.',
 true,
 '["order_number", "total_amount", "number_of_installments", "installments_list"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM message_templates WHERE name = 'installment_plan_created');

INSERT INTO message_templates (name, content, is_active, variables) 
SELECT 'installment_payment_received',
 '✅ تم استلام دفعة القسط بنجاح!

📋 رقم الطلب: {{order_number}}
💰 المبلغ المدفوع: {{amount}}
💳 طريقة الدفع: {{payment_method}}
📅 التاريخ: {{payment_date}}

شكراً لالتزامك بالسداد! 🙏',
 true,
 '["order_number", "amount", "payment_method", "payment_date"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM message_templates WHERE name = 'installment_payment_received');

INSERT INTO message_templates (name, content, is_active, variables) 
SELECT 'installment_reminder',
 '🔔 تذكير بموعد دفع القسط

📋 رقم الطلب: {{order_number}}
💰 المبلغ المطلوب: {{amount}}
📅 موعد الاستحقاق: {{due_date}}
📝 رقم القسط: {{installment_number}}

يرجى السداد في الموعد المحدد. شكراً لك! 🙏',
 true,
 '["order_number", "amount", "due_date", "installment_number"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM message_templates WHERE name = 'installment_reminder');