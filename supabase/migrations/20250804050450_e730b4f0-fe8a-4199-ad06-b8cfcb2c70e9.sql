-- إزالة التريجر الذي يحاول تحديث العمود المحذوف
DROP TRIGGER IF EXISTS update_accounts_receivable_on_payment_change_trigger ON payments;

-- إنشاء تريجر جديد يحدث رصيد العملاء المدينين فقط
CREATE OR REPLACE FUNCTION update_accounts_receivable_simple()
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

-- إنشاء التريجر الجديد
CREATE TRIGGER update_accounts_receivable_simple_trigger
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_accounts_receivable_simple();