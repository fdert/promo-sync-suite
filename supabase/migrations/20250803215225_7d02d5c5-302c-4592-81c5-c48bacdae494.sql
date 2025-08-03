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
true);

-- إضافة إعدادات webhook لإرسال بروفة التصميم
INSERT INTO webhook_settings (webhook_name, webhook_url, webhook_type, is_active, order_statuses, created_by) VALUES 
('design_proof_notification', 
'https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/send-order-notifications',
'outgoing',
true,
ARRAY['design_proof_sent']::text[],
(SELECT id FROM profiles WHERE role = 'admin' LIMIT 1));

-- إضافة عمود لتحديد نوع الملف في print_files إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'print_files' AND column_name = 'file_category') THEN
        ALTER TABLE print_files ADD COLUMN file_category text DEFAULT 'design';
    END IF;
END $$;

-- إضافة عمود لتحديد ما إذا تم إرسال البروفة للعميل
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'print_files' AND column_name = 'sent_to_customer') THEN
        ALTER TABLE print_files ADD COLUMN sent_to_customer boolean DEFAULT false;
    END IF;
END $$;

-- إضافة عمود لتسجيل تاريخ الإرسال للعميل
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'print_files' AND column_name = 'sent_at') THEN
        ALTER TABLE print_files ADD COLUMN sent_at timestamp with time zone;
    END IF;
END $$;