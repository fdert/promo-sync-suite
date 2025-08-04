-- إزالة trigger المدفوعات القديم الذي يحاول تحديث paid_amount غير الموجود
DROP TRIGGER IF EXISTS update_accounts_receivable_on_payment_change_trigger ON payments;

-- إنشاء trigger جديد مبسط للمدفوعات
CREATE OR REPLACE FUNCTION public.simple_payment_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- تحديث رصيد العملاء المدينين عند أي تغيير في المدفوعات
  PERFORM sync_accounts_receivable_balance();
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- إنشاء trigger جديد
CREATE TRIGGER simple_payment_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH STATEMENT
  EXECUTE FUNCTION simple_payment_trigger();