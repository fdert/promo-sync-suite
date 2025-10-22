-- إنشاء trigger لتحديث رصيد الحساب تلقائياً عند إضافة قيد محاسبي

-- دالة لتحديث رصيد الحساب
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- تحديث رصيد الحساب
  -- الرصيد = مجموع المدين - مجموع الدائن
  UPDATE public.accounts
  SET 
    balance = (
      SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0)
      FROM public.account_entries
      WHERE account_id = NEW.account_id
    ),
    updated_at = NOW()
  WHERE id = NEW.account_id;
  
  RETURN NEW;
END;
$$;

-- إنشاء trigger على جدول القيود المحاسبية
DROP TRIGGER IF EXISTS trigger_update_account_balance ON public.account_entries;

CREATE TRIGGER trigger_update_account_balance
AFTER INSERT OR UPDATE ON public.account_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_account_balance();

-- إنشاء قيود محاسبية للمدفوعات الموجودة حالياً
-- هذا سيربط جميع المدفوعات السابقة بالحسابات المحاسبية

DO $$
DECLARE
  payment_record RECORD;
  cash_account_id UUID;
  bank_account_id UUID;
  card_account_id UUID;
  receivable_account_id UUID;
BEGIN
  -- جلب معرفات الحسابات
  SELECT id INTO cash_account_id FROM public.accounts 
  WHERE account_type = 'نقدية' AND is_active = true LIMIT 1;
  
  SELECT id INTO bank_account_id FROM public.accounts 
  WHERE account_type = 'بنك' AND is_active = true LIMIT 1;
  
  SELECT id INTO card_account_id FROM public.accounts 
  WHERE account_type = 'الشبكة' AND is_active = true LIMIT 1;
  
  SELECT id INTO receivable_account_id FROM public.accounts 
  WHERE account_type = 'ذمم مدينة' AND is_active = true LIMIT 1;
  
  -- المرور على جميع المدفوعات التي لا تحتوي على قيود محاسبية
  FOR payment_record IN 
    SELECT p.* FROM public.payments p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.account_entries ae 
      WHERE ae.reference_type = 'payment' 
      AND ae.reference_id = p.id
    )
  LOOP
    -- تحديد الحساب المناسب حسب نوع الدفعة
    DECLARE
      target_account_id UUID;
      payment_type_label TEXT;
    BEGIN
      IF payment_record.payment_type = 'cash' THEN
        target_account_id := cash_account_id;
        payment_type_label := 'نقداً';
      ELSIF payment_record.payment_type = 'bank_transfer' THEN
        target_account_id := bank_account_id;
        payment_type_label := 'تحويل بنكي';
      ELSIF payment_record.payment_type = 'card' THEN
        target_account_id := card_account_id;
        payment_type_label := 'الشبكة';
      ELSE
        target_account_id := cash_account_id;
        payment_type_label := 'نقداً';
      END IF;
      
      -- التأكد من وجود الحسابات المطلوبة
      IF target_account_id IS NOT NULL AND receivable_account_id IS NOT NULL THEN
        -- إنشاء القيد المدين (الصندوق/البنك/الشبكة)
        INSERT INTO public.account_entries (
          account_id, debit, credit, reference_type, reference_id, 
          description, entry_date, created_at, created_by
        ) VALUES (
          target_account_id,
          payment_record.amount,
          0,
          'payment',
          payment_record.id,
          'دفعة للطلب - ' || payment_type_label,
          payment_record.payment_date,
          payment_record.created_at,
          payment_record.created_by
        );
        
        -- إنشاء القيد الدائن (ذمم مدينة)
        INSERT INTO public.account_entries (
          account_id, debit, credit, reference_type, reference_id,
          description, entry_date, created_at, created_by
        ) VALUES (
          receivable_account_id,
          0,
          payment_record.amount,
          'payment',
          payment_record.id,
          'دفعة من العميل للطلب',
          payment_record.payment_date,
          payment_record.created_at,
          payment_record.created_by
        );
      END IF;
    END;
  END LOOP;
  
  RAISE NOTICE 'تم إنشاء القيود المحاسبية للمدفوعات السابقة بنجاح';
END $$;