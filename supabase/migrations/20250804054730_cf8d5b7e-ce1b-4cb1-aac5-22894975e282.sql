-- إزالة القيد الحالي وإضافة قيد جديد يشمل جميع الأنواع الموجودة
ALTER TABLE account_entries DROP CONSTRAINT IF EXISTS account_entries_reference_type_check;

-- إضافة قيد جديد يشمل جميع أنواع المراجع الموجودة والجديدة
ALTER TABLE account_entries ADD CONSTRAINT account_entries_reference_type_check 
CHECK (reference_type IN ('دفعة', 'دفعة_طلب', 'طلب', 'مصروف', 'أخرى', 'فاتورة', 'invoice'));

-- الآن يمكننا إزالة القيود المحاسبية المرتبطة بالفواتير
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