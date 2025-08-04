-- إنشاء trigger جديد لتحديث رصيد العملاء المدينين عند تغيير المدفوعات
CREATE OR REPLACE FUNCTION public.sync_accounts_on_payment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- تحديث رصيد العملاء المدينين بعد أي تغيير في المدفوعات
  UPDATE accounts 
  SET balance = calculate_accounts_receivable_balance(),
      updated_at = now()
  WHERE account_name = 'العملاء المدينون';
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE TRIGGER sync_accounts_on_payment_change
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION sync_accounts_on_payment_change();

-- إنشاء trigger لتحديث الرصيد عند تغيير الفواتير
CREATE OR REPLACE FUNCTION public.sync_accounts_on_invoice_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- تحديث رصيد العملاء المدينين بعد أي تغيير في الفواتير
  UPDATE accounts 
  SET balance = calculate_accounts_receivable_balance(),
      updated_at = now()
  WHERE account_name = 'العملاء المدينون';
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE TRIGGER sync_accounts_on_invoice_change
AFTER INSERT OR UPDATE OR DELETE ON invoices
FOR EACH ROW
EXECUTE FUNCTION sync_accounts_on_invoice_change();