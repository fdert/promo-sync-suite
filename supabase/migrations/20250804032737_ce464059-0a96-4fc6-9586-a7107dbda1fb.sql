-- إصلاح وتوحيد أنواع المدفوعات وربطها بالحسابات المحاسبية

-- أولاً: توحيد أنواع المدفوعات الموجودة
UPDATE payments SET payment_type = 'نقدي' WHERE payment_type IN ('كاش', 'cash', 'Cash');
UPDATE payments SET payment_type = 'الشبكة' WHERE payment_type IN ('شبكة', 'network', 'Network');
UPDATE payments SET payment_type = 'تحويل بنكي' WHERE payment_type IN ('بنك', 'bank', 'Bank Transfer');

-- التأكد من وجود الحسابات الأساسية
INSERT INTO accounts (account_name, account_type, description, balance)
VALUES 
  ('النقدية', 'أصول', 'النقدية في الصندوق', 0),
  ('البنك', 'أصول', 'الحسابات البنكية', 0),
  ('الشبكة', 'أصول', 'مدفوعات الشبكة والبطاقات الائتمانية', 0),
  ('العملاء المدينون', 'أصول', 'المبالغ المستحقة من العملاء', 0)
ON CONFLICT (account_name, account_type) DO NOTHING;

-- إنشاء دالة محسنة لمعالجة القيود المحاسبية للمدفوعات
CREATE OR REPLACE FUNCTION create_payment_accounting_entry_v2()
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
    WHERE reference_type = 'دفعة' AND reference_id = NEW.id;
    
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
        NEW.id,
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
            NEW.id,
            COALESCE(NEW.created_by, auth.uid())
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- حذف المحفز القديم إن وجد
DROP TRIGGER IF EXISTS payment_accounting_trigger ON payments;

-- إنشاء محفز جديد
CREATE TRIGGER payment_accounting_trigger
    AFTER INSERT OR UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION create_payment_accounting_entry_v2();

-- إنشاء دالة لمعالجة المدفوعات الموجودة
CREATE OR REPLACE FUNCTION process_existing_payments()
RETURNS void AS $$
DECLARE
    payment_record RECORD;
BEGIN
    -- معالجة جميع المدفوعات الموجودة
    FOR payment_record IN 
        SELECT * FROM payments 
        WHERE id NOT IN (
            SELECT DISTINCT reference_id::uuid 
            FROM account_entries 
            WHERE reference_type = 'دفعة' 
            AND reference_id IS NOT NULL
        )
    LOOP
        -- تطبيق الدالة على كل دفعة
        PERFORM create_payment_accounting_entry_v2() FROM payments WHERE id = payment_record.id;
        
        -- إدراج القيود يدوياً للمدفوعات الموجودة
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
                WHEN payment_record.payment_type = 'نقدي' THEN 
                    (SELECT id FROM accounts WHERE account_name = 'النقدية' AND account_type = 'أصول' LIMIT 1)
                WHEN payment_record.payment_type = 'تحويل بنكي' THEN 
                    (SELECT id FROM accounts WHERE account_name = 'البنك' AND account_type = 'أصول' LIMIT 1)
                WHEN payment_record.payment_type = 'الشبكة' THEN 
                    (SELECT id FROM accounts WHERE account_name = 'الشبكة' AND account_type = 'أصول' LIMIT 1)
                ELSE 
                    (SELECT id FROM accounts WHERE account_name = 'النقدية' AND account_type = 'أصول' LIMIT 1)
            END,
            payment_record.amount,
            0,
            'استلام دفعة ' || payment_record.payment_type || 
            COALESCE(' من العميل: ' || (
                SELECT c.name FROM invoices i 
                JOIN customers c ON i.customer_id = c.id 
                WHERE i.id = payment_record.invoice_id
            ), '') ||
            COALESCE(' للفاتورة: ' || (
                SELECT invoice_number FROM invoices WHERE id = payment_record.invoice_id
            ), ''),
            'دفعة',
            payment_record.id,
            payment_record.created_by
        WHERE NOT EXISTS (
            SELECT 1 FROM account_entries 
            WHERE reference_type = 'دفعة' 
            AND reference_id = payment_record.id::text
        );
        
        -- إضافة قيد دائن للعملاء المدينون إذا كانت مرتبطة بفاتورة
        IF payment_record.invoice_id IS NOT NULL THEN
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
                payment_record.amount,
                'استلام دفعة ' || payment_record.payment_type || 
                COALESCE(' من العميل: ' || (
                    SELECT c.name FROM invoices i 
                    JOIN customers c ON i.customer_id = c.id 
                    WHERE i.id = payment_record.invoice_id
                ), '') ||
                COALESCE(' للفاتورة: ' || (
                    SELECT invoice_number FROM invoices WHERE id = payment_record.invoice_id
                ), ''),
                'دفعة',
                payment_record.id,
                payment_record.created_by
            WHERE NOT EXISTS (
                SELECT 1 FROM account_entries 
                WHERE reference_type = 'دفعة' 
                AND reference_id = payment_record.id::text
                AND account_id = (SELECT id FROM accounts WHERE account_name = 'العملاء المدينون' AND account_type = 'أصول' LIMIT 1)
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- تشغيل معالجة المدفوعات الموجودة
SELECT process_existing_payments();