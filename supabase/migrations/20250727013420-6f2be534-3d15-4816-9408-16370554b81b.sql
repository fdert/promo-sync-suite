-- إعادة حساب أرصدة جميع الحسابات
UPDATE accounts 
SET balance = (
    SELECT COALESCE(SUM(debit_amount - credit_amount), 0)
    FROM account_entries 
    WHERE account_id = accounts.id
),
updated_at = now();

-- التحقق من أن trigger تحديث الأرصدة يعمل
DROP TRIGGER IF EXISTS update_account_balance_trigger ON account_entries;
CREATE TRIGGER update_account_balance_trigger
    AFTER INSERT OR UPDATE OR DELETE ON account_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balance();