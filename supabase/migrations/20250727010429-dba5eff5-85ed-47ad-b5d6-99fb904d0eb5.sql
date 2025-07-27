-- التأكد من وجود حساب الشبكة أولاً
INSERT INTO public.accounts (account_name, account_type, description, is_active)
VALUES ('الشبكة', 'أصول', 'مدفوعات الشبكة والبطاقات الائتمانية', true)
ON CONFLICT (account_name, account_type) DO NOTHING;

-- الآن إعادة إنشاء القيود المحاسبية للمدفوعات المرتبطة بالشبكة فقط
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
  
  -- معالجة المدفوعات المرتبطة بالشبكة التي لم تتم معالجتها
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