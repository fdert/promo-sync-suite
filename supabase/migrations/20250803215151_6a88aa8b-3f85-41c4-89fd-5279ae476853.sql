-- إضافة قالب رسالة لإرسال بروفة التصميم للعميل
INSERT INTO message_templates (template_name, template_content, template_type, is_active) VALUES 
('design_proof_ready', 
'مرحبا {{customer_name}}،

يسعدنا إبلاغكم بأن بروفة التصميم للطلب {{order_number}} جاهزة للمراجعة.

تفاصيل الطلب:
📦 الخدمة: {{service_name}}
📝 الوصف: {{description}}
💰 المبلغ: {{amount}} ر.س

يرجى مراجعة البروفة والموافقة عليها أو إرسال أي تعديلات مطلوبة.

شكراً لكم،
{{company_name}}

التاريخ: {{date}}',
'order', 
true)
ON CONFLICT (template_name) DO UPDATE SET
template_content = EXCLUDED.template_content,
updated_at = now();

-- إضافة إعدادات webhook لإرسال بروفة التصميم
INSERT INTO webhook_settings (webhook_name, webhook_url, webhook_type, is_active, order_statuses, created_by) VALUES 
('design_proof_notification', 
'https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/send-order-notifications',
'outgoing',
true,
ARRAY['design_proof_sent']::text[],
(SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
) ON CONFLICT (webhook_name) DO UPDATE SET
webhook_url = EXCLUDED.webhook_url,
is_active = EXCLUDED.is_active,
order_statuses = EXCLUDED.order_statuses;