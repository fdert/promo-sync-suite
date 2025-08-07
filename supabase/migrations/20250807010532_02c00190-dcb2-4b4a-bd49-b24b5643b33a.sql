-- إرجاع قالب رسالة الطلب المكتمل لحالته الأصلية
UPDATE message_templates 
SET template_content = 'مرحباً {{customer_name}}! 🎉

✅ *طلبك تم تسليمه واكتماله !*

📋 *تفاصيل الطلب:*
رقم الطلب: {{order_number}}
الخدمة: {{service_name}}
الوصف: {{description}}
الحالة: {{status}}

💰 *المعلومات المالية:*
إجمالي المبلغ: {{amount}} ر.س
المبلغ المدفوع: {{paid_amount}} ر.س
المبلغ المتبقي: {{remaining_amount}} ر.س

📦 *بنود الطلب:*
{{order_items}}

📅 تاريخ التسليم: {{due_date}}

نشكرك لثقتك الغالية بخدماتنا ونتطلع لخدمتك مرة أخرى! 💕

🌟 *نرجو تقييم خدمتنا:*
{{evaluation_link}}

شكراً لاختيارك خدماتنا! 🙏'
WHERE template_name = 'order_completed';

-- تفعيل trigger منفصل لإرسال رسائل التقييم عبر webhook التقييم
CREATE OR REPLACE TRIGGER send_google_review_trigger
    AFTER UPDATE OF status ON orders
    FOR EACH ROW
    WHEN (NEW.status = 'مكتمل' AND (OLD.status IS NULL OR OLD.status != 'مكتمل'))
    EXECUTE FUNCTION send_evaluation_link_on_completion();