-- حذف جميع التريجرز القديمة المرتبطة بالمدفوعات
DROP TRIGGER IF EXISTS update_accounts_receivable_on_payment_change_trigger ON payments;
DROP TRIGGER IF EXISTS sync_accounts_on_payment_change_trigger ON payments;
DROP TRIGGER IF EXISTS update_accounts_receivable_simple_trigger ON payments;

-- حذف الدوال القديمة
DROP FUNCTION IF EXISTS update_accounts_receivable_on_payment_change();
DROP FUNCTION IF EXISTS sync_accounts_on_payment_change();
DROP FUNCTION IF EXISTS update_accounts_receivable_simple();

-- إنشاء دالة جديدة لتحديث رصيد العملاء المدينين فقط
CREATE OR REPLACE FUNCTION update_accounts_receivable_balance()
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
CREATE TRIGGER update_accounts_receivable_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_accounts_receivable_balance();