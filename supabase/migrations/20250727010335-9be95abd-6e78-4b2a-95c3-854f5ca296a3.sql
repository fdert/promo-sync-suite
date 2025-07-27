-- تحديث function الربط المحاسبي لمعالجة جميع أسماء طرق الدفع
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
  
  -- تحديد حساب الدفع حسب نوع الدفع (معالجة جميع الأسماء المختلفة)
  IF payment_type IN ('نقدي', 'كاش', 'cash') THEN
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
    
  ELSIF payment_type IN ('بنكي', 'تحويل بنكي', 'bank_transfer') THEN
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
    
  ELSIF payment_type IN ('شبكة', 'الشبكة', 'بطاقة ائتمان', 'card', 'network') THEN
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
  
  -- إضافة قيد مدين للحساب المحدد (استلام المال)
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

-- تصحيح القيود المحاسبية للمدفوعات السابقة التي لم تتم معالجتها بشكل صحيح
-- حذف القيود القديمة الخاطئة أولاً
DELETE FROM account_entries WHERE reference_type = 'دفعة' AND reference_id IN (
  SELECT id FROM payments WHERE payment_type IN ('شبكة', 'الشبكة') AND id NOT IN (
    SELECT DISTINCT reference_id FROM account_entries 
    WHERE reference_type = 'دفعة' 
    AND account_id = (SELECT id FROM accounts WHERE account_name = 'الشبكة')
  )
);

-- إعادة إنشاء القيود المحاسبية للمدفوعات المرتبطة بالفواتير
DO $$
DECLARE
  payment_rec RECORD;
  customer_name text;
  invoice_number text;
  network_account_id uuid;
  accounts_receivable_id uuid;
BEGIN
  -- جلب معرف حساب الشبكة
  SELECT id INTO network_account_id FROM accounts WHERE account_name = 'الشبكة' AND account_type = 'أصول';
  
  -- جلب معرف حساب العملاء المدينون
  SELECT id INTO accounts_receivable_id FROM accounts WHERE account_name = 'العملاء المدينون' AND account_type = 'أصول';
  
  -- معالجة المدفوعات المرتبطة بالشبكة
  FOR payment_rec IN 
    SELECT p.*, i.invoice_number, c.name as customer_name
    FROM payments p
    LEFT JOIN invoices i ON p.invoice_id = i.id
    LEFT JOIN customers c ON i.customer_id = c.id
    WHERE p.payment_type IN ('شبكة', 'الشبكة')
    AND p.id NOT IN (
      SELECT DISTINCT reference_id FROM account_entries 
      WHERE reference_type = 'دفعة' AND account_id = network_account_id
    )
  LOOP
    -- إضافة قيد مدين للشبكة
    INSERT INTO account_entries (
      account_id, reference_type, reference_id, description, debit_amount, created_by
    ) VALUES (
      network_account_id,
      'دفعة',
      payment_rec.id,
      'استلام دفعة شبكة من العميل: ' || COALESCE(payment_rec.customer_name, 'غير محدد') || 
      CASE WHEN payment_rec.invoice_number IS NOT NULL THEN ' للفاتورة: ' || payment_rec.invoice_number ELSE '' END,
      payment_rec.amount,
      payment_rec.created_by
    );
    
    -- إضافة قيد دائن للعملاء المدينون (فقط إذا كانت مرتبطة بفاتورة)
    IF payment_rec.invoice_id IS NOT NULL THEN
      INSERT INTO account_entries (
        account_id, reference_type, reference_id, description, credit_amount, created_by
      ) VALUES (
        accounts_receivable_id,
        'دفعة',
        payment_rec.id,
        'استلام دفعة شبكة من العميل: ' || COALESCE(payment_rec.customer_name, 'غير محدد') || 
        ' للفاتورة: ' || payment_rec.invoice_number,
        payment_rec.amount,
        payment_rec.created_by
      );
    END IF;
  END LOOP;
END $$;