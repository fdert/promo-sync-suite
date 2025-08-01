-- تصحيح دالة إنشاء القيود المحاسبية للدفعات
DROP FUNCTION IF EXISTS public.create_payment_accounting_entry(uuid, uuid, numeric, text);

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
  
  -- تحديد حساب الدفع حسب نوع الدفع المطابق للواجهة
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
    
  ELSIF payment_type = 'تحويل بنكي' THEN
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
    
  ELSIF payment_type = 'الشبكة' THEN
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

-- تصحيح القيود المحاسبية الموجودة
DO $$
DECLARE
  payment_rec RECORD;
  customer_name text;
  invoice_number text;
  cash_account_id uuid;
  bank_account_id uuid;
  network_account_id uuid;
  accounts_receivable_id uuid;
  payment_account_id uuid;
BEGIN
  -- حذف جميع القيود المحاسبية للدفعات لإعادة إنشائها
  DELETE FROM account_entries WHERE reference_type = 'دفعة';
  
  -- جلب معرفات الحسابات
  SELECT id INTO cash_account_id FROM accounts WHERE account_name = 'النقدية' AND account_type = 'أصول';
  SELECT id INTO bank_account_id FROM accounts WHERE account_name = 'البنك' AND account_type = 'أصول';
  SELECT id INTO network_account_id FROM accounts WHERE account_name = 'الشبكة' AND account_type = 'أصول';
  SELECT id INTO accounts_receivable_id FROM accounts WHERE account_name = 'العملاء المدينون' AND account_type = 'أصول';
  
  -- معالجة جميع المدفوعات مع المطابقة الصحيحة
  FOR payment_rec IN 
    SELECT p.*, i.invoice_number, c.name as customer_name
    FROM payments p
    LEFT JOIN invoices i ON p.invoice_id = i.id
    LEFT JOIN customers c ON i.customer_id = c.id
    ORDER BY p.created_at
  LOOP
    -- تحديد الحساب المناسب حسب طريقة الدفع المطابقة للواجهة
    IF payment_rec.payment_type = 'نقدي' THEN
      payment_account_id := cash_account_id;
    ELSIF payment_rec.payment_type = 'تحويل بنكي' THEN
      payment_account_id := bank_account_id;
    ELSIF payment_rec.payment_type = 'الشبكة' THEN
      payment_account_id := network_account_id;
    ELSE
      payment_account_id := bank_account_id; -- افتراضي
    END IF;
    
    -- إضافة قيد مدين للحساب المحدد (استلام المال)
    INSERT INTO account_entries (
      account_id, reference_type, reference_id, description, debit_amount, created_by, entry_date
    ) VALUES (
      payment_account_id,
      'دفعة',
      payment_rec.id,
      'استلام دفعة ' || payment_rec.payment_type || ' من العميل: ' || 
      COALESCE(payment_rec.customer_name, 'غير محدد') || 
      CASE WHEN payment_rec.invoice_number IS NOT NULL THEN ' للفاتورة: ' || payment_rec.invoice_number ELSE '' END,
      payment_rec.amount,
      payment_rec.created_by,
      payment_rec.payment_date
    );
    
    -- إضافة قيد دائن للعملاء المدينون (فقط إذا كانت مرتبطة بفاتورة)
    IF payment_rec.invoice_id IS NOT NULL THEN
      INSERT INTO account_entries (
        account_id, reference_type, reference_id, description, credit_amount, created_by, entry_date
      ) VALUES (
        accounts_receivable_id,
        'دفعة',
        payment_rec.id,
        'استلام دفعة ' || payment_rec.payment_type || ' من العميل: ' || 
        COALESCE(payment_rec.customer_name, 'غير محدد') || 
        ' للفاتورة: ' || payment_rec.invoice_number,
        payment_rec.amount,
        payment_rec.created_by,
        payment_rec.payment_date
      );
    END IF;
  END LOOP;
END $$;