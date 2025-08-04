-- حذف جميع التريجرز على جدول المدفوعات
DROP TRIGGER IF EXISTS update_accounts_receivable_on_payment_change_trigger ON payments CASCADE;
DROP TRIGGER IF EXISTS sync_accounts_on_payment_change_trigger ON payments CASCADE;
DROP TRIGGER IF EXISTS update_accounts_receivable_simple_trigger ON payments CASCADE;
DROP TRIGGER IF EXISTS update_invoice_paid_amount_trigger ON payments CASCADE;

-- حذف الدوال القديمة مع CASCADE
DROP FUNCTION IF EXISTS update_accounts_receivable_on_payment_change() CASCADE;
DROP FUNCTION IF EXISTS sync_accounts_on_payment_change() CASCADE;
DROP FUNCTION IF EXISTS update_accounts_receivable_simple() CASCADE;

-- إنشاء دالة جديدة بسيطة لتحديث رصيد العملاء المدينين فقط
CREATE OR REPLACE FUNCTION sync_accounts_after_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- تحديث رصيد العملاء المدينين فقط
  PERFORM sync_accounts_receivable_balance();
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- إنشاء التريجر الجديد للمدفوعات
CREATE TRIGGER sync_accounts_after_payment_trigger
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION sync_accounts_after_payment();