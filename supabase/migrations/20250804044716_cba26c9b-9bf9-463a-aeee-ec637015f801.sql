-- تحديث رصيد العملاء المدينين ليعكس النظام الجديد
SELECT sync_accounts_receivable_balance();

-- التحقق من النتيجة
SELECT account_name, balance FROM accounts WHERE account_name = 'العملاء المدينون';