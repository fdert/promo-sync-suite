-- حذف جميع القيود المحاسبية للمدفوعات الموجودة
DELETE FROM account_entries WHERE reference_type = 'payment';

-- تحديث دالة إنشاء القيد المحاسبي للمدفوعات لتشمل جميع أنواع الدفع
CREATE OR REPLACE FUNCTION create_payment_accounting_entry()
RETURNS TRIGGER AS $$
DECLARE
    cash_account_id UUID;
    bank_account_id UUID;
    network_account_id UUID;
    account_id_to_use UUID;
BEGIN
    -- البحث عن معرفات الحسابات
    SELECT id INTO cash_account_id FROM accounts WHERE account_name = 'النقدية' AND account_type = 'أصول' LIMIT 1;
    SELECT id INTO bank_account_id FROM accounts WHERE account_name = 'البنك' AND account_type = 'أصول' LIMIT 1;
    SELECT id INTO network_account_id FROM accounts WHERE account_name = 'الشبكة' AND account_type = 'أصول' LIMIT 1;
    
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
    
    -- إنشاء القيد المحاسبي للمدفوعة (مدين في حساب الأصل)
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
        'مدفوعة - ' || NEW.payment_type,
        'payment',
        NEW.id,
        NEW.created_by
    );
    
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
    account_id_to_use UUID;
BEGIN
    -- البحث عن معرفات الحسابات
    SELECT id INTO cash_account_id FROM accounts WHERE account_name = 'النقدية' AND account_type = 'أصول' LIMIT 1;
    SELECT id INTO bank_account_id FROM accounts WHERE account_name = 'البنك' AND account_type = 'أصول' LIMIT 1;
    SELECT id INTO network_account_id FROM accounts WHERE account_name = 'الشبكة' AND account_type = 'أصول' LIMIT 1;
    
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
        
        -- إنشاء القيد المحاسبي
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
            'مدفوعة - ' || payment_record.payment_type,
            'payment',
            payment_record.id,
            payment_record.created_by
        );
    END LOOP;
END $$;