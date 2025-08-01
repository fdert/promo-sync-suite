-- أولاً: التحقق من قيد التحقق الموجود وتحديثه
ALTER TABLE account_entries DROP CONSTRAINT IF EXISTS account_entries_reference_type_check;

-- إضافة قيد تحقق جديد يشمل جميع الأنواع المطلوبة
ALTER TABLE account_entries ADD CONSTRAINT account_entries_reference_type_check 
CHECK (reference_type IN ('فاتورة', 'دفعة', 'payment', 'مصروف', 'قيد'));

-- حذف جميع القيود المحاسبية للمدفوعات الموجودة
DELETE FROM account_entries WHERE reference_type = 'payment' OR reference_type = 'دفعة';

-- تحديث دالة إنشاء القيد المحاسبي للمدفوعات
CREATE OR REPLACE FUNCTION create_payment_accounting_entry()
RETURNS TRIGGER AS $$
DECLARE
    cash_account_id UUID;
    bank_account_id UUID;
    network_account_id UUID;
    accounts_receivable_id UUID;
    account_id_to_use UUID;
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
        WHEN NEW.payment_type IN ('نقدي', 'كاش', 'Cash') THEN
            account_id_to_use := cash_account_id;
        WHEN NEW.payment_type IN ('تحويل بنكي', 'Bank Transfer', 'بنك') THEN
            account_id_to_use := bank_account_id;
        WHEN NEW.payment_type IN ('الشبكة', 'شبكة', 'Network') THEN
            account_id_to_use := network_account_id;
        ELSE
            account_id_to_use := cash_account_id; -- افتراضي
    END CASE;
    
    -- جلب معلومات الفاتورة والعميل إذا كانت متاحة
    IF NEW.invoice_id IS NOT NULL THEN
        SELECT i.invoice_number, c.name
        INTO invoice_number, customer_name
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        WHERE i.id = NEW.invoice_id;
    END IF;
    
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
        account_id_to_use,
        NEW.amount,
        0,
        'استلام دفعة ' || NEW.payment_type || COALESCE(' من العميل: ' || customer_name, '') || COALESCE(' للفاتورة: ' || invoice_number, ''),
        'دفعة',
        NEW.id,
        NEW.created_by
    );
    
    -- إنشاء قيد دائن للعملاء المدينون إذا كانت مرتبطة بفاتورة
    IF NEW.invoice_id IS NOT NULL THEN
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
            NEW.created_by
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إعادة إنشاء جميع القيود المحاسبية للمدفوعات الموجودة
DO $$
DECLARE
    payment_record RECORD;
    cash_account_id UUID;
    bank_account_id UUID;
    network_account_id UUID;
    accounts_receivable_id UUID;
    account_id_to_use UUID;
    customer_name TEXT;
    invoice_number TEXT;
BEGIN
    -- البحث عن معرفات الحسابات
    SELECT id INTO cash_account_id FROM accounts WHERE account_name = 'النقدية' AND account_type = 'أصول' LIMIT 1;
    SELECT id INTO bank_account_id FROM accounts WHERE account_name = 'البنك' AND account_type = 'أصول' LIMIT 1;
    SELECT id INTO network_account_id FROM accounts WHERE account_name = 'الشبكة' AND account_type = 'أصول' LIMIT 1;
    SELECT id INTO accounts_receivable_id FROM accounts WHERE account_name = 'العملاء المدينون' AND account_type = 'أصول' LIMIT 1;
    
    -- إنشاء القيود للمدفوعات الموجودة
    FOR payment_record IN 
        SELECT * FROM payments 
    LOOP
        -- تحديد الحساب المناسب
        CASE 
            WHEN payment_record.payment_type IN ('نقدي', 'كاش', 'Cash') THEN
                account_id_to_use := cash_account_id;
            WHEN payment_record.payment_type IN ('تحويل بنكي', 'Bank Transfer', 'بنك') THEN
                account_id_to_use := bank_account_id;
            WHEN payment_record.payment_type IN ('الشبكة', 'شبكة', 'Network') THEN
                account_id_to_use := network_account_id;
            ELSE
                account_id_to_use := cash_account_id;
        END CASE;
        
        -- جلب معلومات الفاتورة والعميل إذا كانت متاحة
        customer_name := NULL;
        invoice_number := NULL;
        
        IF payment_record.invoice_id IS NOT NULL THEN
            SELECT i.invoice_number, c.name
            INTO invoice_number, customer_name
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            WHERE i.id = payment_record.invoice_id;
        END IF;
        
        -- إنشاء القيد المحاسبي للدفعة
        INSERT INTO account_entries (
            account_id,
            debit_amount,
            credit_amount,
            description,
            reference_type,
            reference_id,
            created_by
        ) VALUES (
            account_id_to_use,
            payment_record.amount,
            0,
            'استلام دفعة ' || payment_record.payment_type || COALESCE(' من العميل: ' || customer_name, '') || COALESCE(' للفاتورة: ' || invoice_number, ''),
            'دفعة',
            payment_record.id,
            payment_record.created_by
        );
        
        -- إنشاء قيد دائن للعملاء المدينون إذا كانت مرتبطة بفاتورة
        IF payment_record.invoice_id IS NOT NULL THEN
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
                payment_record.amount,
                'استلام دفعة ' || payment_record.payment_type || COALESCE(' من العميل: ' || customer_name, '') || COALESCE(' للفاتورة: ' || invoice_number, ''),
                'دفعة',
                payment_record.id,
                payment_record.created_by
            );
        END IF;
    END LOOP;
END $$;