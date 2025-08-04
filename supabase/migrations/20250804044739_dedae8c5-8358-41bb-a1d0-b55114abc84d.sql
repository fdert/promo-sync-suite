-- إصلاح دالة حساب رصيد العملاء المدينين
CREATE OR REPLACE FUNCTION public.sync_accounts_receivable_balance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- تحديث رصيد العملاء المدينين
  UPDATE accounts 
  SET balance = calculate_accounts_receivable_balance(),
      updated_at = now()
  WHERE account_name = 'العملاء المدينون';
END;
$function$;

-- تحديث الرصيد الآن
SELECT sync_accounts_receivable_balance();