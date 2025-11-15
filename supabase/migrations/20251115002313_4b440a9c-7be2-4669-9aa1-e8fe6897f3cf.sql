-- إضافة قوالب رسائل إدارة المتابعة
DO $$
BEGIN
  -- daily_financial_report
  IF NOT EXISTS (SELECT 1 FROM message_templates WHERE name = 'daily_financial_report') THEN
    INSERT INTO message_templates (name, content, is_active, variables) VALUES
    ('daily_financial_report', '📊 *التقرير المالي اليومي*

📅 التاريخ: {{date}}

💰 *المبالغ المدفوعة اليوم:*
{{total_payments}} ريال

💸 *المصروفات اليومية:*
{{total_expenses}} ريال

📈 *صافي الربح اليومي:*
{{net_profit}} ريال {{profit_icon}}

📦 *الطلبات:*
• طلبات جديدة: {{new_orders_count}}
• طلبات مكتملة: {{completed_orders_count}}

---
تم إنشاء التقرير تلقائياً في تمام الساعة {{time}}', true, '["date", "total_payments", "total_expenses", "net_profit", "profit_icon", "new_orders_count", "completed_orders_count", "time"]'::jsonb);
  END IF;

  -- test_follow_up_system
  IF NOT EXISTS (SELECT 1 FROM message_templates WHERE name = 'test_follow_up_system') THEN
    INSERT INTO message_templates (name, content, is_active, variables) VALUES
    ('test_follow_up_system', '🧪 رسالة اختبار نظام المتابعة

📊 نتائج الاختبار:
✅ إعدادات المتابعة: {{settings_status}}
📱 رقم واتساب فريق المتابعة: {{whatsapp_number}}
📨 الرسائل المعلقة: {{pending_messages}}
📋 الطلبات الحديثة: {{recent_orders}}

⚙️ الإعدادات النشطة:
• إشعار طلب جديد: {{notify_new_order}}
• إشعار تأخير التسليم: {{notify_delivery_delay}}
• إشعار تأخير الدفع: {{notify_payment_delay}}
• إشعار فشل الواتساب: {{notify_whatsapp_failure}}
• إشعار تسجيل المصروفات: {{notify_expense}}
• تقرير مالي يومي: {{daily_report}}

🔧 مهل زمنية:
• مهلة التسليم: {{delivery_delay_days}} أيام
• مهلة الدفع: {{payment_delay_days}} أيام

⏰ وقت الاختبار: {{timestamp}}', true, '["settings_status", "whatsapp_number", "pending_messages", "recent_orders", "notify_new_order", "notify_delivery_delay", "notify_payment_delay", "notify_whatsapp_failure", "notify_expense", "daily_report", "delivery_delay_days", "payment_delay_days", "timestamp"]'::jsonb);
  END IF;

  -- delivery_delay_notification
  IF NOT EXISTS (SELECT 1 FROM message_templates WHERE name = 'delivery_delay_notification') THEN
    INSERT INTO message_templates (name, content, is_active, variables) VALUES
    ('delivery_delay_notification', '⚠️ *تنبيه: تجاوز فترة التسليم*

📦 رقم الطلب: {{order_number}}
👤 اسم العميل: {{customer_name}}
📅 تاريخ التسليم المتوقع: {{delivery_date}}
⏱️ تأخير: {{delay_days}}+ أيام

يرجى المتابعة الفورية مع العميل.', true, '["order_number", "customer_name", "delivery_date", "delay_days"]'::jsonb);
  END IF;

  -- payment_delay_notification
  IF NOT EXISTS (SELECT 1 FROM message_templates WHERE name = 'payment_delay_notification') THEN
    INSERT INTO message_templates (name, content, is_active, variables) VALUES
    ('payment_delay_notification', '💰 *تنبيه: تأخير في الدفعات*

👤 اسم العميل: {{customer_name}}
📱 رقم الواتساب: {{customer_phone}}

💵 الرصيد المستحق: {{outstanding_balance}} ريال
📦 أقدم طلب: {{oldest_order}}
📅 تاريخ الطلب: {{order_date}}
⏱️ مر على الطلب: {{delay_days}}+ أيام

يرجى المتابعة مع العميل لتحصيل المستحقات.', true, '["customer_name", "customer_phone", "outstanding_balance", "oldest_order", "order_date", "delay_days"]'::jsonb);
  END IF;

  -- new_order_notification
  IF NOT EXISTS (SELECT 1 FROM message_templates WHERE name = 'new_order_notification') THEN
    INSERT INTO message_templates (name, content, is_active, variables) VALUES
    ('new_order_notification', '🆕 *طلب جديد*

📦 رقم الطلب: {{order_number}}
👤 اسم العميل: {{customer_name}}
💰 قيمة الطلب: {{total_amount}} ريال
📅 تاريخ التسليم المتوقع: {{delivery_date}}
📝 الملاحظات: {{notes}}

⏰ وقت الطلب: {{timestamp}}', true, '["order_number", "customer_name", "total_amount", "delivery_date", "notes", "timestamp"]'::jsonb);
  END IF;

  -- new_payment_notification
  IF NOT EXISTS (SELECT 1 FROM message_templates WHERE name = 'new_payment_notification') THEN
    INSERT INTO message_templates (name, content, is_active, variables) VALUES
    ('new_payment_notification', '💵 *دفعة جديدة*

💰 المبلغ: {{amount}} ريال
📦 رقم الطلب: {{order_number}}
👤 اسم العميل: {{customer_name}}
💳 نوع الدفع: {{payment_type}}

📊 حالة الطلب:
• إجمالي الطلب: {{total_amount}} ريال
• المدفوع: {{paid_amount}} ريال
• المتبقي: {{remaining_amount}} ريال

⏰ وقت الدفع: {{timestamp}}', true, '["amount", "order_number", "customer_name", "payment_type", "total_amount", "paid_amount", "remaining_amount", "timestamp"]'::jsonb);
  END IF;

  -- new_expense_notification
  IF NOT EXISTS (SELECT 1 FROM message_templates WHERE name = 'new_expense_notification') THEN
    INSERT INTO message_templates (name, content, is_active, variables) VALUES
    ('new_expense_notification', '💸 *مصروف جديد*

💰 المبلغ: {{amount}} ريال
📂 نوع المصروف: {{expense_type}}
📝 الوصف: {{description}}
📅 التاريخ: {{expense_date}}
📋 رقم الإيصال: {{receipt_number}}

⏰ وقت التسجيل: {{timestamp}}', true, '["amount", "expense_type", "description", "expense_date", "receipt_number", "timestamp"]'::jsonb);
  END IF;
END $$;