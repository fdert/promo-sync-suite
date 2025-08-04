-- إصلاح ربط العملاء المدينون بالنظام المحاسبي

-- إنشاء دالة لحساب رصيد العملاء المدينون
CREATE OR REPLACE FUNCTION calculate_accounts_receivable_balance()
RETURNS NUMERIC AS $$
DECLARE
    total_unpaid NUMERIC := 0;
BEGIN
    -- حساب إجمالي الفواتير غير المدفوعة
    SELECT COALESCE(SUM(total_amount - paid_amount), 0)
    INTO total_unpaid
    FROM invoices
    WHERE (total_amount - paid_amount) > 0;
    
    RETURN total_unpaid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- إنشاء دالة محسنة لمعالجة الفواتير محاسبياً
CREATE OR REPLACE FUNCTION handle_invoice_accounting_improved()
RETURNS TRIGGER AS $$
DECLARE
    revenue_account_id UUID;
    accounts_receivable_id UUID;
    customer_name TEXT;
BEGIN
    -- جلب اسم العميل
    SELECT name INTO customer_name
    FROM customers
    WHERE id = NEW.customer_id;
    
    -- البحث عن حساب الإيرادات أو إنشاؤه
    SELECT id INTO revenue_account_id 
    FROM accounts 
    WHERE account_name = 'إيرادات المبيعات' AND account_type = 'إيرادات';
    
    IF revenue_account_id IS NULL THEN
        INSERT INTO accounts (account_name, account_type, description)
        VALUES ('إيرادات المبيعات', 'إيرادات', 'إيرادات من بيع الخدمات والمنتجات')
        RETURNING id INTO revenue_account_id;
    END IF;
    
    -- البحث عن حساب العملاء المدينون
    SELECT id INTO accounts_receivable_id 
    FROM accounts 
    WHERE account_name = 'العملاء المدينون' AND account_type = 'أصول';
    
    -- في حالة إنشاء فاتورة جديدة
    IF TG_OP = 'INSERT' THEN
        -- حذف أي قيود محاسبية سابقة لهذه الفاتورة
        DELETE FROM account_entries 
        WHERE reference_type = 'فاتورة' AND reference_id = NEW.id;
        
        -- إضافة قيد مدين للعملاء المدينون (زيادة المديونية)
        INSERT INTO account_entries (
            account_id, 
            reference_type, 
            reference_id, 
            description, 
            debit_amount,
            credit_amount,
            created_by
        ) VALUES (
            accounts_receivable_id,
            'فاتورة',
            NEW.id,
            'فاتورة رقم: ' || NEW.invoice_number || ' للعميل: ' || COALESCE(customer_name, 'غير محدد'),
            NEW.total_amount,
            0,
            NEW.created_by
        );
        
        -- إضافة قيد دائن للإيرادات
        INSERT INTO account_entries (
            account_id, 
            reference_type, 
            reference_id, 
            description, 
            debit_amount,
            credit_amount,
            created_by
        ) VALUES (
            revenue_account_id,
            'فاتورة',
            NEW.id,
            'إيراد من فاتورة رقم: ' || NEW.invoice_number || ' للعميل: ' || COALESCE(customer_name, 'غير محدد'),
            0,
            NEW.total_amount,
            NEW.created_by
        );
        
        RETURN NEW;
    END IF;
    
    -- في حالة تحديث الفاتورة
    IF TG_OP = 'UPDATE' THEN
        -- إذا تغير المبلغ الإجمالي، نحديث القيود
        IF OLD.total_amount != NEW.total_amount THEN
            -- تحديث قيد العملاء المدينون
            UPDATE account_entries 
            SET debit_amount = NEW.total_amount,
                description = 'فاتورة رقم: ' || NEW.invoice_number || ' للعميل: ' || COALESCE(customer_name, 'غير محدد')
            WHERE reference_type = 'فاتورة' 
            AND reference_id = NEW.id 
            AND account_id = accounts_receivable_id;
            
            -- تحديث قيد الإيرادات
            UPDATE account_entries 
            SET credit_amount = NEW.total_amount,
                description = 'إيراد من فاتورة رقم: ' || NEW.invoice_number || ' للعميل: ' || COALESCE(customer_name, 'غير محدد')
            WHERE reference_type = 'فاتورة' 
            AND reference_id = NEW.id 
            AND account_id = revenue_account_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- في حالة حذف الفاتورة
    IF TG_OP = 'DELETE' THEN
        DELETE FROM account_entries
        WHERE reference_type = 'فاتورة' AND reference_id = OLD.id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- حذف المحفزات القديمة
DROP TRIGGER IF EXISTS handle_invoice_accounting ON invoices;

-- إنشاء محفز جديد للفواتير
CREATE TRIGGER handle_invoice_accounting_improved_trigger
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION handle_invoice_accounting_improved();

-- تنظيف القيود المحاسبية القديمة للفواتير
DELETE FROM account_entries WHERE reference_type = 'فاتورة';

-- إعادة إنشاء القيود المحاسبية لجميع الفواتير الموجودة
INSERT INTO account_entries (
    account_id, 
    reference_type, 
    reference_id, 
    description, 
    debit_amount,
    credit_amount,
    created_by
)
SELECT 
    (SELECT id FROM accounts WHERE account_name = 'العملاء المدينون' AND account_type = 'أصول' LIMIT 1),
    'فاتورة',
    i.id,
    'فاتورة رقم: ' || i.invoice_number || ' للعميل: ' || c.name,
    i.total_amount,
    0,
    i.created_by
FROM invoices i
JOIN customers c ON i.customer_id = c.id;

-- إضافة قيود الإيرادات
INSERT INTO account_entries (
    account_id, 
    reference_type, 
    reference_id, 
    description, 
    debit_amount,
    credit_amount,
    created_by
)
SELECT 
    COALESCE(
        (SELECT id FROM accounts WHERE account_name = 'إيرادات المبيعات' AND account_type = 'إيرادات' LIMIT 1),
        (SELECT id FROM accounts WHERE account_type = 'إيرادات' LIMIT 1)
    ),
    'فاتورة',
    i.id,
    'إيراد من فاتورة رقم: ' || i.invoice_number || ' للعميل: ' || c.name,
    0,
    i.total_amount,
    i.created_by
FROM invoices i
JOIN customers c ON i.customer_id = c.id;

-- تحديث أرصدة الحسابات
UPDATE accounts 
SET balance = (
    SELECT COALESCE(SUM(debit_amount - credit_amount), 0)
    FROM account_entries 
    WHERE account_id = accounts.id
);

-- إنشاء view لعرض العملاء المدينون بالتفصيل
CREATE OR REPLACE VIEW customer_outstanding_balances AS
SELECT 
    c.id as customer_id,
    c.name as customer_name,
    COALESCE(SUM(i.total_amount - i.paid_amount), 0) as outstanding_balance,
    COUNT(CASE WHEN (i.total_amount - i.paid_amount) > 0 THEN 1 END) as unpaid_invoices_count,
    MAX(i.due_date) as latest_due_date,
    MIN(CASE WHEN (i.total_amount - i.paid_amount) > 0 THEN i.due_date END) as earliest_due_date
FROM customers c
LEFT JOIN invoices i ON c.id = i.customer_id
GROUP BY c.id, c.name
HAVING COALESCE(SUM(i.total_amount - i.paid_amount), 0) > 0
ORDER BY outstanding_balance DESC;