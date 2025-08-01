-- First, let's see the current payment accounting function
SELECT routine_definition FROM information_schema.routines 
WHERE routine_name = 'create_payment_accounting_entry';

-- Update the payment accounting function to handle new payment methods
CREATE OR REPLACE FUNCTION public.create_payment_accounting_entry(payment_id uuid, invoice_id uuid, payment_amount numeric, payment_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cash_account_id uuid;
  bank_account_id uuid;
  network_account_id uuid;
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
  IF payment_type = 'نقدي' OR payment_type = 'كاش' THEN
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
    
  ELSIF payment_type = 'بنكي' OR payment_type = 'تحويل بنكي' THEN
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
    
  ELSIF payment_type = 'شبكة' OR payment_type = 'بطاقة ائتمان' THEN
    -- البحث عن حساب الشبكة أو إنشاؤه
    SELECT id INTO network_account_id 
    FROM public.accounts 
    WHERE account_name = 'الشبكة' AND account_type = 'أصول';
    
    IF network_account_id IS NULL THEN
      INSERT INTO public.accounts (account_name, account_type, description)
      VALUES ('الشبكة', 'أصول', 'مدفوعات الشبكة والبطاقات الائتمانية')
      RETURNING id INTO network_account_id;
    END IF;
    
    payment_account_id := network_account_id;
    
  ELSE
    -- للطرق الأخرى، استخدم البنك كافتراضي
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
  
  -- إضافة قيد مدين للنقدية/البنك/الشبكة (استلام المال)
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
    'استلام دفعة ' || payment_type || ' من العميل: ' || customer_name || ' للفاتورة: ' || invoice_number,
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
    'استلام دفعة ' || payment_type || ' من العميل: ' || customer_name || ' للفاتورة: ' || invoice_number,
    payment_amount,
    auth.uid()
  );
END;
$function$;