-- تنظيف وتصحيح الحسابات والقيود المحاسبية

-- 1. إزالة الحسابات المكررة وغير الصحيحة
DELETE FROM accounts WHERE account_name = 'الشبكة ' AND account_type = 'أصول';
DELETE FROM accounts WHERE account_name = 'الشبكة ' AND account_type = 'إيرادات';

-- 2. حذف جميع القيود المحاسبية للدفعات لإعادة إنشائها بشكل صحيح
DELETE FROM account_entries WHERE reference_type = 'دفعة';

-- 3. إعادة إنشاء جميع القيود المحاسبية للدفعات بشكل صحيح
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
  -- جلب معرفات الحسابات
  SELECT id INTO cash_account_id FROM accounts WHERE account_name = 'النقدية' AND account_type = 'أصول';
  SELECT id INTO bank_account_id FROM accounts WHERE account_name = 'البنك' AND account_type = 'أصول';
  SELECT id INTO network_account_id FROM accounts WHERE account_name = 'الشبكة' AND account_type = 'أصول';
  SELECT id INTO accounts_receivable_id FROM accounts WHERE account_name = 'العملاء المدينون' AND account_type = 'أصول';
  
  -- معالجة جميع المدفوعات
  FOR payment_rec IN 
    SELECT p.*, i.invoice_number, c.name as customer_name
    FROM payments p
    LEFT JOIN invoices i ON p.invoice_id = i.id
    LEFT JOIN customers c ON i.customer_id = c.id
    ORDER BY p.created_at
  LOOP
    -- تحديد الحساب المناسب حسب طريقة الدفع
    IF payment_rec.payment_type IN ('نقدي', 'كاش', 'cash') THEN
      payment_account_id := cash_account_id;
    ELSIF payment_rec.payment_type IN ('بنكي', 'تحويل بنكي', 'bank_transfer') THEN
      payment_account_id := bank_account_id;
    ELSIF payment_rec.payment_type IN ('شبكة', 'الشبكة', 'بطاقة ائتمان', 'card', 'network') THEN
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