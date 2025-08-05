-- إضافة حالة الطلب لقالب "جاهز للتسليم"
UPDATE message_templates 
SET template_content = 'مرحباً {{customer_name}}! 🎉

✅ *طلبك جاهز للتسليم!*

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
WHERE template_name = 'order_ready_for_delivery';

-- إضافة حالة الطلب لقالب "قيد التنفيذ"
UPDATE message_templates 
SET template_content = 'مرحباً {{customer_name}}! 🚀

⚙️ *بدء العمل على طلبك!*

📋 *تفاصيل الطلب:*
رقم الطلب: {{order_number}}
الخدمة: {{service_name}}
الوصف: {{description}}
الحالة: {{status}}

💰 *المعلومات المالية:*
إجمالي المبلغ: {{amount}} ر.س
المبلغ المدفوع: {{paid_amount}} ر.س

📅 تاريخ التسليم المتوقع: {{due_date}}

سيتم إعلامك عند انتهاء كل مرحلة من مراحل العمل. شكراً لثقتك! 💪

{{company_name}}'
WHERE template_name = 'order_in_progress';

-- إضافة حالة الطلب لقالب "مكتمل"
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

-- إضافة حالة الطلب لقالب "قيد المراجعة"
UPDATE message_templates 
SET template_content = 'مرحباً {{customer_name}}! 🔍

📋 *طلبك قيد المراجعة*

📋 *تفاصيل الطلب:*
رقم الطلب: {{order_number}}
الخدمة: {{service_name}}
الوصف: {{description}}
الحالة: {{status}}

💰 *المعلومات المالية:*
إجمالي المبلغ: {{amount}} ر.س
المبلغ المدفوع: {{paid_amount}} ر.س

🔎 نقوم حالياً بمراجعة التفاصيل للتأكد من الجودة العالية. سيتم إعلامك فور الانتهاء من المراجعة.

شكراً لصبرك وثقتك بخدماتنا! 🙏

{{company_name}}'
WHERE template_name = 'order_under_review';