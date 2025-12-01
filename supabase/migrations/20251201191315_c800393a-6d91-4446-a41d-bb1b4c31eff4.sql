-- تحديث قالب إنشاء خطة التقسيط لإضافة رابط العقد
UPDATE message_templates 
SET 
  content = '🎉 تم إنشاء خطة تقسيط لطلبك!

📋 رقم الطلب: {{order_number}}
💰 إجمالي المبلغ المتبقي: {{total_amount}}
📅 عدد الأقساط: {{number_of_installments}}

تفاصيل الأقساط:
{{installments_list}}

📄 لعرض عقد التقسيط الإلكتروني والموافقة عليه:
{{contract_url}}

سيتم تذكيرك قبل كل دفعة بيومين وبيوم واحد.',
  variables = '["order_number", "total_amount", "number_of_installments", "installments_list", "contract_url"]'::jsonb,
  updated_at = NOW()
WHERE name = 'installment_plan_created';