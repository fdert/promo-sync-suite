-- إزالة جميع الـ triggers والدوال المكسورة أولاً
DROP TRIGGER IF EXISTS sync_accounts_after_order_change_trigger ON orders CASCADE;
DROP TRIGGER IF EXISTS sync_accounts_after_payment_trigger ON payments CASCADE;
DROP TRIGGER IF EXISTS payment_accounting_trigger ON payments CASCADE;
DROP TRIGGER IF EXISTS order_payment_accounting_trigger ON payments CASCADE;

DROP FUNCTION IF EXISTS sync_accounts_after_order_change() CASCADE;
DROP FUNCTION IF EXISTS calculate_accounts_receivable_from_orders() CASCADE;
DROP FUNCTION IF EXISTS create_order_payment_accounting_entry() CASCADE;

-- تحديث constraint ليشمل 'دفعة طلب' مع مسافة كما هو مستخدم في الكود
ALTER TABLE account_entries DROP CONSTRAINT IF EXISTS account_entries_reference_type_check;
ALTER TABLE account_entries ADD CONSTRAINT account_entries_reference_type_check 
CHECK (reference_type IN ('دفعة', 'دفعة_طلب', 'دفعة طلب', 'طلب', 'مصروف', 'أخرى', 'فاتورة', 'invoice'));

-- تحديث القيود الموجودة لتوحيد النوع
UPDATE account_entries 
SET reference_type = 'دفعة طلب' 
WHERE reference_type = 'دفعة_طلب';

-- إزالة القيود المحاسبية المرتبطة بالفواتير
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