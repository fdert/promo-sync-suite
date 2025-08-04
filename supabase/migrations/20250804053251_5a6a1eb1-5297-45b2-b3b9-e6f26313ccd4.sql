-- إنشاء triggers للطلبات
DROP TRIGGER IF EXISTS handle_order_accounting_trigger ON orders;
CREATE TRIGGER handle_order_accounting_trigger
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION create_order_accounting_entry();

-- إنشاء trigger للمدفوعات المرتبطة بالطلبات
DROP TRIGGER IF EXISTS handle_order_payment_accounting_trigger ON payments;
CREATE TRIGGER handle_order_payment_accounting_trigger
    AFTER INSERT OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_payment_accounting();

-- تحديث دالة مزامنة أرصدة العملاء المدينون
CREATE OR REPLACE FUNCTION sync_accounts_receivable_from_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- تحديث رصيد العملاء المدينين بناءً على الطلبات
    UPDATE accounts 
    SET balance = calculate_accounts_receivable_from_orders(),
        updated_at = now()
    WHERE account_name = 'العملاء المدينون';
END;
$$;

-- إنشاء trigger لمزامنة الأرصدة بعد تغيير المدفوعات
DROP TRIGGER IF EXISTS sync_accounts_after_order_payment ON payments;
CREATE TRIGGER sync_accounts_after_order_payment
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION sync_accounts_receivable_from_orders();