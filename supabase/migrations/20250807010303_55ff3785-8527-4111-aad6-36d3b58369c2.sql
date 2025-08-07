-- حذف trigger رسائل التقييم المنفصلة
DROP TRIGGER IF EXISTS send_evaluation_trigger ON orders;
DROP TRIGGER IF EXISTS send_google_review_trigger ON orders;

-- تحديث قالب رسالة الطلب المكتمل ليشمل رابط التقييم
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

🌟 *نرجو تقييم تجربتك معنا على خرائط جوجل:*
https://search.google.com/local/writereview?placeid=ChIJL19uXc2vuxURY7wfwdte-cU

تقييمك مهم جداً لنا ويساعدنا على تحسين خدماتنا.

شكراً لاختيارك خدماتنا! 🙏'
WHERE template_name = 'order_completed';