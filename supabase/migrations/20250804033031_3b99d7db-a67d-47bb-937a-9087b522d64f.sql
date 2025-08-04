-- إصلاح وتوحيد أنواع المدفوعات وربطها بالحسابات المحاسبية

-- أولاً: توحيد أنواع المدفوعات الموجودة
UPDATE payments SET payment_type = 'نقدي' WHERE payment_type IN ('كاش', 'cash', 'Cash');
UPDATE payments SET payment_type = 'الشبكة' WHERE payment_type IN ('شبكة', 'network', 'Network');
UPDATE payments SET payment_type = 'تحويل بنكي' WHERE payment_type IN ('بنك', 'bank', 'Bank Transfer');

-- إنشاء دالة محسنة لمعالجة القيود المحاسبية للمدفوعات
CREATE OR REPLACE FUNCTION create_payment_accounting_entry_fixed()
RETURNS TRIGGER AS $$
DECLARE
    cash_account_id UUID;
    bank_account_id UUID;
    network_account_id UUID;
    accounts_receivable_id UUID;
    payment_account_id UUID;
    customer_name TEXT;
    invoice_number TEXT;
BEGIN
    -- البحث عن معرفات الحسابات
    SELECT id INTO cash_account_id FROM accounts WHERE account_name = 'النقدية' AND account_type = 'أصول' LIMIT 1;
    SELECT id INTO bank_account_id FROM accounts WHERE account_name = 'البنك' AND account_type = 'أصول' LIMIT 1;
    SELECT id INTO network_account_id FROM accounts WHERE account_name = 'الشبكة' AND account_type = 'أصول' LIMIT 1;
    SELECT id INTO accounts_receivable_id FROM accounts WHERE account_name = 'العملاء المدينون' AND account_type = 'أصول' LIMIT 1;
    
    -- تحديد الحساب المناسب حسب نوع الدفع
    CASE 
        WHEN NEW.payment_type = 'نقدي' THEN
            payment_account_id := cash_account_id;
        WHEN NEW.payment_type = 'تحويل بنكي' THEN
            payment_account_id := bank_account_id;
        WHEN NEW.payment_type = 'الشبكة' THEN
            payment_account_id := network_account_id;
        ELSE
            payment_account_id := cash_account_id; -- افتراضي
    END CASE;
    
    -- جلب معلومات الفاتورة والعميل إذا كانت متاحة
    IF NEW.invoice_id IS NOT NULL THEN
        SELECT i.invoice_number, c.name
        INTO invoice_number, customer_name
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        WHERE i.id = NEW.invoice_id;
    END IF;
    
    -- حذف القيود المحاسبية القديمة إن وجدت
    DELETE FROM account_entries 
    WHERE reference_type = 'دفعة' AND reference_id = NEW.id::text;
    
    -- إنشاء القيد المحاسبي للدفعة (مدين في حساب الأصل)
    INSERT INTO account_entries (
        account_id,
        debit_amount,
        credit_amount,
        description,
        reference_type,
        reference_id,
        created_by
    ) VALUES (
        payment_account_id,
        NEW.amount,
        0,
        'استلام دفعة ' || NEW.payment_type || COALESCE(' من العميل: ' || customer_name, '') || COALESCE(' للفاتورة: ' || invoice_number, ''),
        'دفعة',
        NEW.id::text,
        COALESCE(NEW.created_by, auth.uid())
    );
    
    -- إنشاء قيد دائن للعملاء المدينون إذا كانت مرتبطة بفاتورة
    IF NEW.invoice_id IS NOT NULL AND accounts_receivable_id IS NOT NULL THEN
        INSERT INTO account_entries (
            account_id,
            debit_amount,
            credit_amount,
            description,
            reference_type,
            reference_id,
            created_by
        ) VALUES (
            accounts_receivable_id,
            0,
            NEW.amount,
            'استلام دفعة ' || NEW.payment_type || COALESCE(' من العميل: ' || customer_name, '') || COALESCE(' للفاتورة: ' || invoice_number, ''),
            'دفعة',
            NEW.id::text,
            COALESCE(NEW.created_by, auth.uid())
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- حذف المحفز القديم إن وجد
DROP TRIGGER IF EXISTS payment_accounting_trigger ON payments;

-- إنشاء محفز جديد
CREATE TRIGGER payment_accounting_trigger_fixed
    AFTER INSERT OR UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION create_payment_accounting_entry_fixed();

-- معالجة المدفوعات الموجودة التي لم تُربط بالحسابات بعد
INSERT INTO account_entries (
    account_id,
    debit_amount,
    credit_amount,
    description,
    reference_type,
    reference_id,
    created_by
)
SELECT 
    CASE 
        WHEN p.payment_type = 'نقدي' THEN 
            (SELECT id FROM accounts WHERE account_name = 'النقدية' AND account_type = 'أصول' LIMIT 1)
        WHEN p.payment_type = 'تحويل بنكي' THEN 
            (SELECT id FROM accounts WHERE account_name = 'البنك' AND account_type = 'أصول' LIMIT 1)
        WHEN p.payment_type = 'الشبكة' THEN 
            (SELECT id FROM accounts WHERE account_name = 'الشبكة' AND account_type = 'أصول' LIMIT 1)
        ELSE 
            (SELECT id FROM accounts WHERE account_name = 'النقدية' AND account_type = 'أصول' LIMIT 1)
    END,
    p.amount,
    0,
    'استلام دفعة ' || p.payment_type || 
    COALESCE(' من العميل: ' || c.name, '') ||
    COALESCE(' للفاتورة: ' || i.invoice_number, ''),
    'دفعة',
    p.id::text,
    p.created_by
FROM payments p
LEFT JOIN invoices i ON p.invoice_id = i.id
LEFT JOIN customers c ON i.customer_id = c.id
WHERE p.id::text NOT IN (
    SELECT DISTINCT reference_id::text
    FROM account_entries 
    WHERE reference_type = 'دفعة' 
    AND reference_id IS NOT NULL
);

-- إضافة قيود دائنة للعملاء المدينون للمدفوعات المرتبطة بفواتير
INSERT INTO account_entries (
    account_id,
    debit_amount,
    credit_amount,
    description,
    reference_type,
    reference_id,
    created_by
)
SELECT 
    (SELECT id FROM accounts WHERE account_name = 'العملاء المدينون' AND account_type = 'أصول' LIMIT 1),
    0,
    p.amount,
    'استلام دفعة ' || p.payment_type || 
    COALESCE(' من العميل: ' || c.name, '') ||
    COALESCE(' للفاتورة: ' || i.invoice_number, ''),
    'دفعة',
    p.id::text,
    p.created_by
FROM payments p
INNER JOIN invoices i ON p.invoice_id = i.id
INNER JOIN customers c ON i.customer_id = c.id
WHERE p.id::text NOT IN (
    SELECT DISTINCT reference_id::text
    FROM account_entries 
    WHERE reference_type = 'دفعة' 
    AND reference_id IS NOT NULL
    AND account_id = (SELECT id FROM accounts WHERE account_name = 'العملاء المدينون' AND account_type = 'أصول' LIMIT 1)
);