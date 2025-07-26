-- إضافة function لمعالجة القيود المحاسبية عند الدفع
CREATE OR REPLACE FUNCTION public.create_payment_accounting_entry(
  payment_id uuid, 
  invoice_id uuid,
  payment_amount numeric,
  payment_type text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cash_account_id uuid;
  bank_account_id uuid;
  accounts_receivable_id uuid;
  payment_account_id uuid;
  customer_name text;
  invoice_number text;
BEGIN
  -- جلب معلومات الفاتورة والعميل
  SELECT 
    i.invoice_number,
    c.name
  INTO invoice_number, customer_name
  FROM invoices i
  JOIN customers c ON i.customer_id = c.id
  WHERE i.id = invoice_id;
  
  -- البحث عن حساب العملاء المدينون
  SELECT id INTO accounts_receivable_id 
  FROM public.accounts 
  WHERE account_name = 'العملاء المدينون' AND account_type = 'أصول';
  
  -- تحديد حساب الدفع حسب نوع الدفع
  IF payment_type = 'نقدي' THEN
    -- البحث عن حساب النقدية أو إنشاؤه
    SELECT id INTO cash_account_id 
    FROM public.accounts 
    WHERE account_name = 'النقدية' AND account_type = 'أصول';
    
    IF cash_account_id IS NULL THEN
      INSERT INTO public.accounts (account_name, account_type, description)
      VALUES ('النقدية', 'أصول', 'النقدية في الصندوق')
      RETURNING id INTO cash_account_id;
    END IF;
    
    payment_account_id := cash_account_id;
    
  ELSE
    -- البحث عن حساب البنك أو إنشاؤه
    SELECT id INTO bank_account_id 
    FROM public.accounts 
    WHERE account_name = 'البنك' AND account_type = 'أصول';
    
    IF bank_account_id IS NULL THEN
      INSERT INTO public.accounts (account_name, account_type, description)
      VALUES ('البنك', 'أصول', 'الحسابات البنكية')
      RETURNING id INTO bank_account_id;
    END IF;
    
    payment_account_id := bank_account_id;
  END IF;
  
  -- إضافة قيد مدين للنقدية/البنك (استلام المال)
  INSERT INTO public.account_entries (
    account_id, 
    reference_type, 
    reference_id, 
    description, 
    debit_amount,
    created_by
  ) VALUES (
    payment_account_id,
    'دفعة',
    payment_id,
    'استلام دفعة من العميل: ' || customer_name || ' للفاتورة: ' || invoice_number,
    payment_amount,
    auth.uid()
  );
  
  -- إضافة قيد دائن للعملاء المدينون (تقليل الدين)
  INSERT INTO public.account_entries (
    account_id, 
    reference_type, 
    reference_id, 
    description, 
    credit_amount,
    created_by
  ) VALUES (
    accounts_receivable_id,
    'دفعة',
    payment_id,
    'استلام دفعة من العميل: ' || customer_name || ' للفاتورة: ' || invoice_number,
    payment_amount,
    auth.uid()
  );
END;
$function$;

-- إضافة trigger لمعالجة القيود المحاسبية عند إضافة دفعة
CREATE OR REPLACE FUNCTION public.handle_payment_accounting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- في حالة إنشاء دفعة جديدة
  IF TG_OP = 'INSERT' AND NEW.invoice_id IS NOT NULL THEN
    -- إضافة القيود المحاسبية
    PERFORM public.create_payment_accounting_entry(
      NEW.id,
      NEW.invoice_id,
      NEW.amount,
      NEW.payment_type
    );
    
    RETURN NEW;
  END IF;
  
  -- في حالة حذف الدفعة
  IF TG_OP = 'DELETE' AND OLD.invoice_id IS NOT NULL THEN
    -- حذف القيود المحاسبية المرتبطة
    DELETE FROM public.account_entries
    WHERE reference_type = 'دفعة' AND reference_id = OLD.id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- إنشاء trigger للدفعات
CREATE TRIGGER handle_payment_accounting_trigger
  AFTER INSERT OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_payment_accounting();