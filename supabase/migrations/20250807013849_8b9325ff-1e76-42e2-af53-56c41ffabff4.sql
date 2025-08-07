-- إزالة جميع الـ triggers المتعلقة بإرسال مراجعات جوجل تلقائياً
DROP TRIGGER IF EXISTS send_evaluation_link_on_completion_trigger ON orders;
DROP TRIGGER IF EXISTS evaluation_trigger ON orders;
DROP TRIGGER IF EXISTS google_review_trigger ON orders;

-- إزالة الدالة القديمة التي تُرسل الرسائل تلقائياً
DROP FUNCTION IF EXISTS send_evaluation_link_on_completion();

-- التأكد من وجود الدالة الجديدة فقط التي تُنشئ evaluation بدون إرسال
DROP TRIGGER IF EXISTS create_evaluation_on_completion_trigger ON orders;

CREATE OR REPLACE FUNCTION create_evaluation_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- التحقق من تغيير الحالة إلى "مكتمل"
    IF NEW.status = 'مكتمل' AND (OLD.status IS NULL OR OLD.status != 'مكتمل') THEN
        
        RAISE LOG 'إنشاء تقييم للطلب: %', NEW.order_number;
        
        -- إنشاء سجل تقييم جديد بدون إرسال رسالة جوجل
        -- سيكون بحالة pending في انتظار مراجعة الإدارة
        INSERT INTO evaluations (
            order_id,
            customer_id,
            evaluation_token,
            google_review_status,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            NEW.customer_id,
            'eval_' || NEW.id || '_' || extract(epoch from now()),
            'pending',
            NOW(),
            NOW()
        )
        ON CONFLICT (order_id) DO NOTHING; -- تجنب التكرار إذا كان التقييم موجود
        
        RAISE LOG 'تم إنشاء تقييم للطلب بنجاح';
    END IF;
    
    RETURN NEW;
END;
$function$;

-- ربط الـ trigger الجديد فقط
CREATE TRIGGER create_evaluation_on_completion_trigger
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION create_evaluation_on_completion();