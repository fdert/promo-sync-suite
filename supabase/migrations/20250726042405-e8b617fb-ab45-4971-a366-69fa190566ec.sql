-- تحديث قوالب الرسائل لتتضمن رابط الفاتورة
UPDATE message_templates 
SET template_content = '{{customer_name}}، تم إنشاء فاتورة رقم {{invoice_number}} بقيمة {{amount}} ر.س. تاريخ الاستحقاق: {{due_date}}. يرجى المراجعة والدفع.

🔗 رابط الفاتورة: {{invoice_link}}'
WHERE template_name = 'invoice_created';

UPDATE message_templates 
SET template_content = 'شكراً لك {{customer_name}}! تم استلام دفع فاتورة رقم {{invoice_number}} بقيمة {{amount}} ر.س بنجاح.

🔗 رابط الفاتورة: {{invoice_link}}'
WHERE template_name = 'invoice_paid';

UPDATE message_templates 
SET template_content = '{{customer_name}}، فاتورة رقم {{invoice_number}} متأخرة السداد. القيمة: {{amount}} ر.س. يرجى الدفع في أقرب وقت لتجنب أي رسوم إضافية.

🔗 رابط الفاتورة: {{invoice_link}}'
WHERE template_name = 'invoice_overdue';