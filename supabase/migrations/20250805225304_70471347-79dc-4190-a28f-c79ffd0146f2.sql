-- إضافة قوالب الحالات المفقودة
DO $$
BEGIN
  -- قيد الانتظار
  IF NOT EXISTS (SELECT 1 FROM message_templates WHERE template_name = 'order_on_hold') THEN
    INSERT INTO message_templates (template_name, template_content, template_type, is_active)
    VALUES (
      'order_on_hold',
      'مرحباً {{customer_name}}! ⏸️

🔄 *طلبك قيد الانتظار مؤقتاً*

📋 *تفاصيل الطلب:*
رقم الطلب: {{order_number}}
الخدمة: {{service_name}}
الوصف: {{description}}

💰 *المعلومات المالية:*
إجمالي المبلغ: {{amount}} ر.س
المبلغ المدفوع: {{paid_amount}} ر.س

📋 *بنود الطلب:*
{{order_items}}

⏳ سيتم استئناف العمل على طلبك قريباً وسنبقيك على اطلاع بأي تطورات.

شكراً لصبرك وتفهمك! 🙏

{{company_name}}',
      'order',
      true
    );
  END IF;

  -- طلب ملغي
  IF NOT EXISTS (SELECT 1 FROM message_templates WHERE template_name = 'order_cancelled') THEN
    INSERT INTO message_templates (template_name, template_content, template_type, is_active)
    VALUES (
      'order_cancelled',
      'مرحباً {{customer_name}}! ❌

😔 *تم إلغاء طلبك*

📋 *تفاصيل الطلب:*
رقم الطلب: {{order_number}}
الخدمة: {{service_name}}
الوصف: {{description}}

💰 *المبلغ:* {{amount}} ر.س

نعتذر لأي إزعاج قد يكون نتج عن هذا الإلغاء.

📞 للاستفسار أو إعادة الطلب، يرجى التواصل معنا.

{{company_name}}',
      'order',
      true
    );
  END IF;

  -- طلب مؤكد
  IF NOT EXISTS (SELECT 1 FROM message_templates WHERE template_name = 'order_confirmed') THEN
    INSERT INTO message_templates (template_name, template_content, template_type, is_active)
    VALUES (
      'order_confirmed',
      'مرحباً {{customer_name}}! ✅

✨ *تم تأكيد طلبك بنجاح!*

📋 *تفاصيل الطلب:*
رقم الطلب: {{order_number}}
الخدمة: {{service_name}}
الوصف: {{description}}

💰 *المعلومات المالية:*
إجمالي المبلغ: {{amount}} ر.س
المبلغ المدفوع: {{paid_amount}} ر.س

📋 *بنود الطلب:*
{{order_items}}

📅 تاريخ التسليم المتوقع: {{due_date}}

سيبدأ فريقنا بالعمل على طلبك قريباً. شكراً لثقتك! 💪

{{company_name}}',
      'order',
      true
    );
  END IF;

  -- إضافة قالب عام لتحديث الحالة
  IF NOT EXISTS (SELECT 1 FROM message_templates WHERE template_name = 'order_status_updated') THEN
    INSERT INTO message_templates (template_name, template_content, template_type, is_active)
    VALUES (
      'order_status_updated',
      'مرحباً {{customer_name}}! 🔄

📝 *تم تحديث حالة طلبك*

📋 *تفاصيل الطلب:*
رقم الطلب: {{order_number}}
الخدمة: {{service_name}}
الحالة الجديدة: {{status}}

💰 *المبلغ:* {{amount}} ر.س

سنبقيك على اطلاع بأي تطورات جديدة! 📲

{{company_name}}',
      'order',
      true
    );
  END IF;
END $$;