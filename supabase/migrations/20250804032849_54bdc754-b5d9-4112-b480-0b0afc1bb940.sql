-- إنشاء قيود محاسبية للمدفوعات المفقودة
CREATE OR REPLACE FUNCTION public.process_missing_payment_entries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  payment_record RECORD;
  cash_account_id uuid;
  bank_account_id uuid;
  network_account_id uuid;
  payment_account_id uuid;
BEGIN
  -- التأكد من وجود الحسابات الأساسية
  SELECT id INTO cash_account_id FROM accounts WHERE account_name = 'النقدية' AND account_type = 'أصول';
  SELECT id INTO bank_account_id FROM accounts WHERE account_name = 'البنك' AND account_type = 'أصول';
  SELECT id INTO network_account_id FROM accounts WHERE account_name = 'الشبكة' AND account_type = 'أصول';
  
  -- معالجة المدفوعات التي لا تحتوي على قيود محاسبية
  FOR payment_record IN 
    SELECT p.* FROM payments p
    WHERE NOT EXISTS (
      SELECT 1 FROM account_entries ae 
      WHERE ae.reference_type = 'دفعة' AND ae.reference_id = p.id
    )
  LOOP
    -- تحديد نوع الحساب حسب طريقة الدفع
    CASE 
      WHEN payment_record.payment_type IN ('نقدي', 'كاش', 'Cash') THEN
        payment_account_id := cash_account_id;
      WHEN payment_record.payment_type IN ('تحويل بنكي', 'Bank Transfer', 'بنك') THEN
        payment_account_id := bank_account_id;
      WHEN payment_record.payment_type IN ('الشبكة', 'شبكة', 'Network') THEN
        payment_account_id := network_account_id;
      ELSE
        payment_account_id := cash_account_id; -- افتراضي
    END CASE;
    
    -- إضافة القيد المحاسبي (مدين في حساب الأصل)
    INSERT INTO account_entries (
      account_id,
      debit_amount,
      credit_amount,
      description,
      reference_type,
      reference_id,
      created_by,
      created_at
    ) VALUES (
      payment_account_id,
      payment_record.amount,
      0,
      'دفعة ' || payment_record.payment_type || ' بتاريخ ' || payment_record.payment_date::text,
      'دفعة',
      payment_record.id,
      payment_record.created_by,
      payment_record.created_at
    );
  END LOOP;
  
  RAISE NOTICE 'تم معالجة المدفوعات المفقودة';
END;
$function$;

-- تشغيل الدالة لمعالجة المدفوعات المفقودة
SELECT public.process_missing_payment_entries();

-- تحديث دالة إنشاء القيود المحاسبية للمدفوعات
CREATE OR REPLACE FUNCTION public.handle_payment_accounting_improved()
RETURNS trigger
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
  description_text text;
BEGIN
  -- في حالة إنشاء دفعة جديدة
  IF TG_OP = 'INSERT' THEN
    -- البحث عن الحسابات
    SELECT id INTO cash_account_id FROM accounts WHERE account_name = 'النقدية' AND account_type = 'أصول';
    SELECT id INTO bank_account_id FROM accounts WHERE account_name = 'البنك' AND account_type = 'أصول';
    SELECT id INTO network_account_id FROM accounts WHERE account_name = 'الشبكة' AND account_type = 'أصول';
    SELECT id INTO accounts_receivable_id FROM accounts WHERE account_name = 'العملاء المدينون' AND account_type = 'أصول';
    
    -- تحديد الحساب المناسب حسب نوع الدفع
    CASE 
      WHEN NEW.payment_type IN ('نقدي', 'كاش', 'Cash') THEN
        payment_account_id := cash_account_id;
      WHEN NEW.payment_type IN ('تحويل بنكي', 'Bank Transfer', 'بنك') THEN
        payment_account_id := bank_account_id;
      WHEN NEW.payment_type IN ('الشبكة', 'شبكة', 'Network') THEN
        payment_account_id := network_account_id;
      ELSE
        payment_account_id := cash_account_id; -- افتراضي
    END CASE;
    
    -- جلب معلومات الفاتورة والعميل إذا كانت متاحة
    IF NEW.invoice_id IS NOT NULL THEN
      SELECT i.invoice_number, c.name
      INTO invoice_number, customer_name
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.id = NEW.invoice_id;
      
      description_text := 'استلام دفعة ' || NEW.payment_type || ' من العميل: ' || COALESCE(customer_name, 'غير محدد') || ' للفاتورة: ' || COALESCE(invoice_number, 'غير محدد');
    ELSE
      description_text := 'دفعة ' || NEW.payment_type || ' بتاريخ ' || NEW.payment_date::text;
    END IF;
    
    -- إنشاء القيد المحاسبي (مدين في حساب الأصل)
    INSERT INTO account_entries (
      account_id,
      debit_amount,
      credit_amount,
      description,
      reference_type,
      reference_id,
      created_by
    ) VALUES (
      payment_account_id,
      NEW.amount,
      0,
      description_text,
      'دفعة',
      NEW.id,
      NEW.created_by
    );
    
    -- إنشاء قيد دائن للعملاء المدينون إذا كانت مرتبطة بفاتورة
    IF NEW.invoice_id IS NOT NULL AND accounts_receivable_id IS NOT NULL THEN
      INSERT INTO account_entries (
        account_id,
        debit_amount,
        credit_amount,
        description,
        reference_type,
        reference_id,
        created_by
      ) VALUES (
        accounts_receivable_id,
        0,
        NEW.amount,
        description_text,
        'دفعة',
        NEW.id,
        NEW.created_by
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- في حالة حذف الدفعة
  IF TG_OP = 'DELETE' THEN
    -- حذف القيود المحاسبية المرتبطة
    DELETE FROM account_entries
    WHERE reference_type = 'دفعة' AND reference_id = OLD.id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- إزالة التريغر القديم وإنشاء الجديد
DROP TRIGGER IF EXISTS payment_accounting_trigger ON payments;
DROP TRIGGER IF EXISTS handle_payment_accounting_trigger ON payments;

CREATE TRIGGER payment_accounting_improved_trigger
  AFTER INSERT OR DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION handle_payment_accounting_improved();