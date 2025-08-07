-- إضافة unique constraint على order_id في جدول evaluations
ALTER TABLE evaluations ADD CONSTRAINT unique_evaluation_per_order UNIQUE (order_id);

-- تحديث trigger ليعمل بشكل صحيح
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
        
        -- التحقق من عدم وجود تقييم مسبق لهذا الطلب
        IF NOT EXISTS (SELECT 1 FROM evaluations WHERE order_id = NEW.id) THEN
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
            );
            
            RAISE LOG 'تم إنشاء تقييم للطلب بنجاح';
        ELSE
            RAISE LOG 'التقييم موجود مسبقاً للطلب: %', NEW.order_number;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;