-- إضافة الحالات المفقودة لجدول الطلبات
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status = ANY (ARRAY[
  'جديد'::text, 
  'قيد المعالجة'::text, 
  'قيد التنفيذ'::text,
  'قيد المراجعة'::text,
  'مكتمل'::text, 
  'ملغي'::text, 
  'مؤجل'::text, 
  'في انتظار الدفع'::text, 
  'جاهز للتسليم'::text
]));

-- تحديث الدالة لإضافة دعم لحالة "قيد المراجعة"
CREATE OR REPLACE FUNCTION public.advanced_order_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    order_data JSONB;
    template_name TEXT;
BEGIN
    -- في حالة تحديث حالة الطلب
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        
        -- إعداد بيانات الطلب
        order_data := jsonb_build_object(
            'order_id', NEW.id,
            'order_number', NEW.order_number,
            'service_name', NEW.service_name,
            'description', NEW.description,
            'amount', NEW.amount,
            'paid_amount', NEW.paid_amount,
            'payment_type', NEW.payment_type,
            'status', NEW.status,
            'priority', NEW.priority,
            'start_date', NEW.start_date,
            'due_date', NEW.due_date,
            'order_items', true
        );
        
        -- تحديد قالب الرسالة حسب الحالة
        CASE NEW.status
            WHEN 'مؤكد' THEN
                template_name := 'order_confirmed';
            WHEN 'قيد التنفيذ' THEN
                template_name := 'order_in_progress';
            WHEN 'قيد المراجعة' THEN
                template_name := 'order_under_review';
            WHEN 'جاهز للتسليم' THEN
                template_name := 'order_ready_for_delivery';
            WHEN 'مكتمل' THEN
                template_name := 'order_completed';
            WHEN 'ملغي' THEN
                template_name := 'order_cancelled';
            ELSE
                template_name := NULL;
        END CASE;
        
        -- إرسال رسالة واتساب إذا كان هناك قالب مناسب
        IF template_name IS NOT NULL AND NEW.customer_id IS NOT NULL THEN
            PERFORM send_whatsapp_notification(NEW.customer_id, template_name, order_data);
        END IF;
        
        -- إرسال إشعار عادي للنظام
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type
        ) VALUES (
            NEW.created_by,
            'تحديث حالة الطلب',
            'تم تحديث حالة الطلب ' || NEW.order_number || ' إلى: ' || NEW.status,
            'info'
        );
    END IF;
    
    -- في حالة إنشاء طلب جديد
    IF TG_OP = 'INSERT' THEN
        -- إعداد بيانات الطلب
        order_data := jsonb_build_object(
            'order_id', NEW.id,
            'order_number', NEW.order_number,
            'service_name', NEW.service_name,
            'description', NEW.description,
            'amount', NEW.amount,
            'paid_amount', NEW.paid_amount,
            'payment_type', NEW.payment_type,
            'status', NEW.status,
            'priority', NEW.priority,
            'start_date', NEW.start_date,
            'due_date', NEW.due_date,
            'order_items', true
        );
        
        -- إرسال رسالة ترحيب وتأكيد الطلب
        IF NEW.customer_id IS NOT NULL THEN
            PERFORM send_whatsapp_notification(NEW.customer_id, 'order_created', order_data);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- إضافة القوالب المفقودة لرسائل الواتس آب (بدون عمود description)
INSERT INTO public.message_templates (template_name, template_content, is_active) 
VALUES 
('order_in_progress', 'مرحباً {{customer_name}}! 🚀

⚙️ *بدء العمل على طلبك!*

📋 *تفاصيل الطلب:*
رقم الطلب: {{order_number}}
الخدمة: {{service_name}}
الوصف: {{description}}

💰 *المعلومات المالية:*
إجمالي المبلغ: {{amount}} ر.س
المبلغ المدفوع: {{paid_amount}} ر.س

📅 تاريخ التسليم المتوقع: {{due_date}}

سيتم إعلامك عند انتهاء كل مرحلة من مراحل العمل. شكراً لثقتك! 💪', true),

('order_under_review', 'مرحباً {{customer_name}}! 🔍

📋 *طلبك قيد المراجعة*

📋 *تفاصيل الطلب:*
رقم الطلب: {{order_number}}
الخدمة: {{service_name}}
الوصف: {{description}}

💰 *المعلومات المالية:*
إجمالي المبلغ: {{amount}} ر.س
المبلغ المدفوع: {{paid_amount}} ر.س

🔎 نقوم حالياً بمراجعة التفاصيل للتأكد من الجودة العالية. سيتم إعلامك فور الانتهاء من المراجعة.

شكراً لصبرك وثقتك بخدماتنا! 🙏', true)

ON CONFLICT (template_name) DO UPDATE SET
  template_content = EXCLUDED.template_content,
  is_active = EXCLUDED.is_active;