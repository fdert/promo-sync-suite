-- إنشاء قوالب الرسائل الافتراضية
INSERT INTO message_templates (template_name, template_content, template_type) VALUES
('order_confirmed', '{{customer_name}}، تم تأكيد طلبك رقم {{order_number}}. بدأ العمل على مشروعك وسيتم إنجازه خلال {{estimated_time}}.', 'order'),
('order_in_progress', '{{customer_name}}، طلبك رقم {{order_number}} قيد التنفيذ حالياً. التقدم: {{progress}}%. سنبقيك على اطلاع بآخر التطورات.', 'order'),
('order_completed', 'تهانينا {{customer_name}}! تم إنجاز طلبك رقم {{order_number}} بنجاح. يمكنك الآن مراجعة النتائج. نشكرك لثقتك بخدماتنا!', 'order'),
('order_cancelled', 'عزيزي {{customer_name}}، تم إلغاء طلبك رقم {{order_number}}. للاستفسار يرجى التواصل معنا.', 'order'),
('invoice_created', '{{customer_name}}، تم إنشاء فاتورة رقم {{invoice_number}} بقيمة {{amount}} ر.س. تاريخ الاستحقاق: {{due_date}}. يرجى المراجعة والدفع.', 'invoice'),
('invoice_paid', 'شكراً لك {{customer_name}}! تم استلام دفع فاتورة رقم {{invoice_number}} بقيمة {{amount}} ر.س بنجاح.', 'invoice'),
('invoice_overdue', '{{customer_name}}، فاتورة رقم {{invoice_number}} متأخرة السداد. القيمة: {{amount}} ر.س. يرجى الدفع في أقرب وقت لتجنب أي رسوم إضافية.', 'invoice'),
('welcome_message', 'أهلاً وسهلاً {{customer_name}}! نرحب بك في {{company_name}}. نحن هنا لخدمتك.', 'general'),
('thank_you', 'شكراً لك {{customer_name}} لاختيار خدماتنا. نتطلع للعمل معك مجدداً.', 'general')
ON CONFLICT (template_name) DO UPDATE SET 
  template_content = EXCLUDED.template_content,
  updated_at = now();