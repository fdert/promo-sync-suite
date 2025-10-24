-- تحديث جدول evaluations لإضافة حقول التقييم التلقائي
ALTER TABLE public.evaluations
ADD COLUMN IF NOT EXISTS evaluation_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- إنشاء فهرس على evaluation_token للبحث السريع
CREATE INDEX IF NOT EXISTS idx_evaluations_token ON public.evaluations(evaluation_token);

-- دالة لتوليد token فريد للتقييم
CREATE OR REPLACE FUNCTION generate_evaluation_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- توليد token عشوائي
    token := encode(gen_random_bytes(16), 'hex');
    
    -- التحقق من عدم وجود token مشابه
    SELECT EXISTS(SELECT 1 FROM public.evaluations WHERE evaluation_token = token) INTO exists;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- دالة لإرسال رابط التقييم عند اكتمال الطلب
CREATE OR REPLACE FUNCTION send_evaluation_on_order_complete()
RETURNS TRIGGER AS $$
DECLARE
  eval_token TEXT;
  eval_id UUID;
  customer_phone TEXT;
  order_num TEXT;
BEGIN
  -- التحقق من أن الحالة الجديدة هي "مكتمل" والحالة القديمة ليست "مكتمل"
  IF NEW.status = 'مكتمل' AND (OLD.status IS NULL OR OLD.status != 'مكتمل') THEN
    
    -- التحقق من وجود عميل
    IF NEW.customer_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- جلب رقم واتساب العميل
    SELECT whatsapp INTO customer_phone
    FROM public.customers
    WHERE id = NEW.customer_id;
    
    -- إذا لم يكن هناك رقم واتساب، لا نفعل شيء
    IF customer_phone IS NULL OR customer_phone = '' THEN
      RETURN NEW;
    END IF;
    
    -- توليد token للتقييم
    eval_token := generate_evaluation_token();
    
    -- إنشاء أو تحديث سجل التقييم
    INSERT INTO public.evaluations (
      customer_id,
      order_id,
      evaluation_token,
      created_at
    )
    VALUES (
      NEW.customer_id,
      NEW.id,
      eval_token,
      NOW()
    )
    ON CONFLICT (order_id) 
    DO UPDATE SET
      evaluation_token = EXCLUDED.evaluation_token,
      sent_at = NULL
    RETURNING id INTO eval_id;
    
    -- إرسال رسالة واتساب مع رابط التقييم
    INSERT INTO public.whatsapp_messages (
      to_number,
      message_type,
      message_content,
      customer_id,
      status,
      is_reply
    )
    VALUES (
      customer_phone,
      'text',
      '🌟 عزيزنا العميل، شكراً لثقتك بنا!' || E'\n\n' ||
      '✅ تم اكتمال طلبك رقم: ' || NEW.order_number || E'\n\n' ||
      '📝 نرجو تقييم تجربتك معنا من خلال الرابط التالي:' || E'\n' ||
      'https://pqrzkfpowjutylegdcxj.supabase.co/evaluation/' || eval_token || E'\n\n' ||
      '⭐ رأيك يهمنا لتحسين خدماتنا',
      NEW.customer_id,
      'pending',
      false
    );
    
    -- تحديث وقت الإرسال
    UPDATE public.evaluations
    SET sent_at = NOW()
    WHERE id = eval_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- إنشاء trigger لإرسال التقييم التلقائي
DROP TRIGGER IF EXISTS trigger_send_evaluation_on_complete ON public.orders;
CREATE TRIGGER trigger_send_evaluation_on_complete
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION send_evaluation_on_order_complete();

-- إضافة constraint فريد على order_id لمنع تكرار التقييمات لنفس الطلب
ALTER TABLE public.evaluations
DROP CONSTRAINT IF EXISTS evaluations_order_id_unique;

ALTER TABLE public.evaluations
ADD CONSTRAINT evaluations_order_id_unique UNIQUE (order_id);