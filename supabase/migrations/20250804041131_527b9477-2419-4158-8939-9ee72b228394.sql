-- تصحيح رصيد حساب العملاء المدينون
-- أولاً: تحديث رصيد الحساب ليعكس الديون الفعلية
UPDATE accounts 
SET balance = (
  SELECT COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0)
  FROM invoices 
  WHERE (total_amount - COALESCE(paid_amount, 0)) > 0
)
WHERE account_name = 'العملاء المدينون';

-- ثانياً: إنشاء دالة محدثة لحساب رصيد العملاء المدينون
CREATE OR REPLACE FUNCTION sync_accounts_receivable_balance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- تحديث رصيد حساب العملاء المدينون بناءً على الديون الفعلية
  UPDATE accounts 
  SET balance = (
    SELECT COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0)
    FROM invoices 
    WHERE (total_amount - COALESCE(paid_amount, 0)) > 0
  ),
  updated_at = now()
  WHERE account_name = 'العملاء المدينون';
END;
$$;

-- ثالثاً: إنشاء trigger لتحديث رصيد العملاء المدينون عند تحديث الفواتير
CREATE OR REPLACE FUNCTION update_accounts_receivable_on_invoice_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- تحديث رصيد العملاء المدينون
  PERFORM sync_accounts_receivable_balance();
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- إنشاء trigger للفواتير
DROP TRIGGER IF EXISTS update_accounts_receivable_trigger ON invoices;
CREATE TRIGGER update_accounts_receivable_trigger
  AFTER INSERT OR UPDATE OF total_amount, paid_amount OR DELETE
  ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_accounts_receivable_on_invoice_change();

-- رابعاً: إنشاء trigger لتحديث رصيد العملاء المدينون عند إضافة/تعديل المدفوعات
CREATE OR REPLACE FUNCTION update_accounts_receivable_on_payment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- تحديث paid_amount في الفاتورة
  IF TG_OP = 'INSERT' AND NEW.invoice_id IS NOT NULL THEN
    UPDATE invoices 
    SET paid_amount = COALESCE(paid_amount, 0) + NEW.amount
    WHERE id = NEW.invoice_id;
  ELSIF TG_OP = 'DELETE' AND OLD.invoice_id IS NOT NULL THEN
    UPDATE invoices 
    SET paid_amount = GREATEST(COALESCE(paid_amount, 0) - OLD.amount, 0)
    WHERE id = OLD.invoice_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.invoice_id IS NOT NULL THEN
    -- إزالة المبلغ القديم وإضافة الجديد
    UPDATE invoices 
    SET paid_amount = GREATEST(COALESCE(paid_amount, 0) - COALESCE(OLD.amount, 0) + NEW.amount, 0)
    WHERE id = NEW.invoice_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- إنشاء trigger للمدفوعات
DROP TRIGGER IF EXISTS update_invoice_paid_amount_trigger ON payments;
CREATE TRIGGER update_invoice_paid_amount_trigger
  AFTER INSERT OR UPDATE OR DELETE
  ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_accounts_receivable_on_payment_change();

-- تشغيل التحديث الأولي
SELECT sync_accounts_receivable_balance();