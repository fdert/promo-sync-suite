-- إجبار إعادة حساب جميع أرصدة الحسابات
UPDATE public.accounts 
SET balance = (
  SELECT COALESCE(SUM(debit_amount - credit_amount), 0)
  FROM public.account_entries 
  WHERE account_id = accounts.id
),
updated_at = now()
WHERE is_active = true;