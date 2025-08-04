-- إزالة الدوال القديمة المتعلقة بالفواتير والدوال المكسورة
DROP FUNCTION IF EXISTS public.handle_invoice_accounting_improved() CASCADE;
DROP FUNCTION IF EXISTS public.create_invoice_accounting_entry(uuid, text, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.sync_accounts_after_order_change() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_accounts_receivable_from_orders() CASCADE;

-- تحديث دالة حساب رصيد العملاء المدينين لتعتمد على الطلبات فقط
CREATE OR REPLACE FUNCTION public.calculate_accounts_receivable_balance()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    total_unpaid NUMERIC := 0;
BEGIN
    -- حساب إجمالي المبالغ غير المدفوعة من الطلبات فقط
    SELECT COALESCE(SUM(outstanding_balance), 0)
    INTO total_unpaid
    FROM customer_order_balances
    WHERE outstanding_balance > 0;
    
    RETURN total_unpaid;
END;
$function$;

-- إزالة جميع القيود المحاسبية المرتبطة بالفواتير
DELETE FROM account_entries 
WHERE reference_type IN ('فاتورة', 'invoice');

-- إزالة القيود المحاسبية للمدفوعات المرتبطة بالفواتير
DELETE FROM account_entries 
WHERE reference_type = 'دفعة' 
AND reference_id IN (
    SELECT id FROM payments WHERE invoice_id IS NOT NULL
);

-- تحديث جميع المدفوعات لإزالة ربطها بالفواتير
UPDATE payments 
SET invoice_id = NULL 
WHERE order_id IS NOT NULL;

-- حذف المدفوعات المرتبطة بالفواتير فقط
DELETE FROM payments 
WHERE invoice_id IS NOT NULL AND order_id IS NULL;

-- التأكد من وجود حساب الإيرادات
INSERT INTO accounts (account_name, account_type, description)
VALUES ('إيرادات المبيعات', 'إيرادات', 'إيرادات من بيع الخدمات والمنتجات')
ON CONFLICT DO NOTHING;

-- مزامنة أرصدة العملاء المدينون
UPDATE accounts 
SET balance = calculate_accounts_receivable_balance(),
    updated_at = now()
WHERE account_name = 'العملاء المدينون';