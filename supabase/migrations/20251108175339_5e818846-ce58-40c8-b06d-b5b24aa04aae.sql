-- إضافة قوالب رسائل الواتساب لتحديثات حالات الطلبات

-- قالب تأكيد الطلب
INSERT INTO public.message_templates (name, content, is_active, variables)
SELECT 'order_confirmed',
  '✅ تم تأكيد طلبك بنجاح!

مرحباً {{customer_name}}،

تم تأكيد طلبك رقم: {{order_number}}
📦 الخدمة: {{service_name}}

📅 تاريخ التسليم المتوقع: {{delivery_date}}

💰 الملخص المالي:
• قيمة الطلب: {{amount}} ر.س
• المدفوع: {{paid_amount}} ر.س
• المتبقي: {{remaining_amount}} ر.س

📋 بنود الطلب:
{{order_items}}

شكراً لثقتك بنا
{{company_name}}',
  true,
  '["customer_name", "order_number", "service_name", "delivery_date", "amount", "paid_amount", "remaining_amount", "order_items", "company_name"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.message_templates WHERE name = 'order_confirmed');

-- قالب الطلب قيد التنفيذ
INSERT INTO public.message_templates (name, content, is_active, variables)
SELECT 'order_in_progress',
  '⚙️ طلبك قيد التنفيذ

مرحباً {{customer_name}}،

نود إعلامك بأن طلبك رقم: {{order_number}}
📦 الخدمة: {{service_name}}

✅ الحالة: قيد التنفيذ
📅 تاريخ التسليم المتوقع: {{delivery_date}}

💰 الملخص المالي:
• قيمة الطلب: {{amount}} ر.س
• المدفوع: {{paid_amount}} ر.س
• المتبقي: {{remaining_amount}} ر.س

نعمل على إنجاز طلبك في أسرع وقت ممكن
{{company_name}}',
  true,
  '["customer_name", "order_number", "service_name", "delivery_date", "amount", "paid_amount", "remaining_amount", "company_name"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.message_templates WHERE name = 'order_in_progress');

-- قالب الطلب قيد المراجعة
INSERT INTO public.message_templates (name, content, is_active, variables)
SELECT 'order_under_review',
  '🔍 طلبك قيد المراجعة

مرحباً {{customer_name}}،

طلبك رقم: {{order_number}}
📦 الخدمة: {{service_name}}

📋 الحالة: قيد المراجعة للتأكد من الجودة
📅 تاريخ التسليم المتوقع: {{delivery_date}}

💰 الملخص المالي:
• قيمة الطلب: {{amount}} ر.س
• المدفوع: {{paid_amount}} ر.س
• المتبقي: {{remaining_amount}} ر.س

سنقوم بإعلامك فور اكتمال المراجعة
{{company_name}}',
  true,
  '["customer_name", "order_number", "service_name", "delivery_date", "amount", "paid_amount", "remaining_amount", "company_name"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.message_templates WHERE name = 'order_under_review');

-- قالب الطلب جاهز للتسليم
INSERT INTO public.message_templates (name, content, is_active, variables)
SELECT 'order_ready_for_delivery',
  '🎉 طلبك جاهز للتسليم!

مرحباً {{customer_name}}،

يسعدنا إعلامك بأن طلبك جاهز! 🎊
🔢 رقم الطلب: {{order_number}}
📦 الخدمة: {{service_name}}

📅 يمكنك استلام طلبك في: {{delivery_date}}

💰 الملخص المالي:
• قيمة الطلب: {{amount}} ر.س
• المدفوع: {{paid_amount}} ر.س
• المتبقي: {{remaining_amount}} ر.س

نتطلع لرؤيتك قريباً!
{{company_name}}',
  true,
  '["customer_name", "order_number", "service_name", "delivery_date", "amount", "paid_amount", "remaining_amount", "company_name"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.message_templates WHERE name = 'order_ready_for_delivery');

-- قالب الطلب الملغي
INSERT INTO public.message_templates (name, content, is_active, variables)
SELECT 'order_cancelled',
  '❌ تم إلغاء الطلب

مرحباً {{customer_name}}،

نأسف لإبلاغك بأنه تم إلغاء طلبك
🔢 رقم الطلب: {{order_number}}
📦 الخدمة: {{service_name}}

💰 الملخص المالي:
• قيمة الطلب: {{amount}} ر.س
• المدفوع: {{paid_amount}} ر.س

في حال وجود أي استفسار، يرجى التواصل معنا
{{company_name}}',
  true,
  '["customer_name", "order_number", "service_name", "amount", "paid_amount", "company_name"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.message_templates WHERE name = 'order_cancelled');

-- قالب الطلب قيد الانتظار
INSERT INTO public.message_templates (name, content, is_active, variables)
SELECT 'order_on_hold',
  '⏸️ طلبك قيد الانتظار مؤقتاً

مرحباً {{customer_name}}،

طلبك رقم: {{order_number}}
📦 الخدمة: {{service_name}}

⏸️ الحالة: قيد الانتظار مؤقتاً
📅 تاريخ التسليم المتوقع: {{delivery_date}}

💰 الملخص المالي:
• قيمة الطلب: {{amount}} ر.س
• المدفوع: {{paid_amount}} ر.س
• المتبقي: {{remaining_amount}} ر.س

سنقوم بإعلامك فور استئناف العمل على طلبك
{{company_name}}',
  true,
  '["customer_name", "order_number", "service_name", "delivery_date", "amount", "paid_amount", "remaining_amount", "company_name"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.message_templates WHERE name = 'order_on_hold');

-- قالب إنشاء طلب جديد
INSERT INTO public.message_templates (name, content, is_active, variables)
SELECT 'order_created',
  '🆕 تم استلام طلبك بنجاح!

مرحباً {{customer_name}}،

شكراً لطلبك! تم تسجيل طلبك بنجاح
🔢 رقم الطلب: {{order_number}}
📦 الخدمة: {{service_name}}

📅 تاريخ التسليم المتوقع: {{delivery_date}}

💰 الملخص المالي:
• قيمة الطلب: {{amount}} ر.س
• المدفوع: {{paid_amount}} ر.س
• المتبقي: {{remaining_amount}} ر.س

📋 بنود الطلب:
{{order_items}}

سنقوم بإعلامك بأي تحديثات
{{company_name}}',
  true,
  '["customer_name", "order_number", "service_name", "delivery_date", "amount", "paid_amount", "remaining_amount", "order_items", "company_name"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.message_templates WHERE name = 'order_created');

-- قالب عام لتحديث حالة الطلب (احتياطي)
INSERT INTO public.message_templates (name, content, is_active, variables)
SELECT 'order_status_updated',
  '📢 تحديث حالة طلبك

مرحباً {{customer_name}}،

تم تحديث حالة طلبك
🔢 رقم الطلب: {{order_number}}
📦 الخدمة: {{service_name}}

✅ الحالة الجديدة: {{status}}
📅 تاريخ التسليم المتوقع: {{delivery_date}}

💰 الملخص المالي:
• قيمة الطلب: {{amount}} ر.س
• المدفوع: {{paid_amount}} ر.س
• المتبقي: {{remaining_amount}} ر.س

شكراً لثقتك بنا
{{company_name}}',
  true,
  '["customer_name", "order_number", "service_name", "status", "delivery_date", "amount", "paid_amount", "remaining_amount", "company_name"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.message_templates WHERE name = 'order_status_updated');