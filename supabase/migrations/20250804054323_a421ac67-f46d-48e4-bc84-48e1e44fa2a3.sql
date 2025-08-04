-- إزالة الدوال المحاسبية للفواتير وإبقاء فقط دوال الطلبات
DROP FUNCTION IF EXISTS public.handle_invoice_accounting_improved() CASCADE;
DROP FUNCTION IF EXISTS public.create_invoice_accounting_entry(uuid, text, numeric) CASCADE;

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

-- تحديث جميع المدفوعات لإزالة ربطها بالفواتير (الاحتفاظ فقط بالمرتبطة بالطلبات)
UPDATE payments 
SET invoice_id = NULL 
WHERE order_id IS NOT NULL;

-- حذف المدفوعات المرتبطة بالفواتير فقط (غير مرتبطة بطلبات)
DELETE FROM payments 
WHERE invoice_id IS NOT NULL AND order_id IS NULL;

-- إنشاء دالة جديدة لمعالجة المحاسبة للطلبات فقط
CREATE OR REPLACE FUNCTION public.handle_order_accounting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    accounts_receivable_id UUID;
    revenue_account_id UUID;
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
    
    -- في حالة إنشاء طلب جديد
    IF TG_OP = 'INSERT' THEN
        -- حذف أي قيود محاسبية سابقة لهذا الطلب
        DELETE FROM account_entries 
        WHERE reference_type = 'طلب' AND reference_id = NEW.id;
        
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
            'طلب',
            NEW.id,
            'طلب رقم: ' || NEW.order_number || ' للعميل: ' || COALESCE(customer_name, 'غير محدد'),
            NEW.amount,
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
            'طلب',
            NEW.id,
            'إيراد من طلب رقم: ' || NEW.order_number || ' للعميل: ' || COALESCE(customer_name, 'غير محدد'),
            0,
            NEW.amount,
            NEW.created_by
        );
        
        RETURN NEW;
    END IF;
    
    -- في حالة تحديث الطلب
    IF TG_OP = 'UPDATE' THEN
        -- إذا تغير المبلغ، نحديث القيود
        IF OLD.amount != NEW.amount THEN
            -- تحديث قيد العملاء المدينون
            UPDATE account_entries 
            SET debit_amount = NEW.amount,
                description = 'طلب رقم: ' || NEW.order_number || ' للعميل: ' || COALESCE(customer_name, 'غير محدد')
            WHERE reference_type = 'طلب' 
            AND reference_id = NEW.id 
            AND account_id = accounts_receivable_id;
            
            -- تحديث قيد الإيرادات
            UPDATE account_entries 
            SET credit_amount = NEW.amount,
                description = 'إيراد من طلب رقم: ' || NEW.order_number || ' للعميل: ' || COALESCE(customer_name, 'غير محدد')
            WHERE reference_type = 'طلب' 
            AND reference_id = NEW.id 
            AND account_id = revenue_account_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- في حالة حذف الطلب
    IF TG_OP = 'DELETE' THEN
        DELETE FROM account_entries
        WHERE reference_type = 'طلب' AND reference_id = OLD.id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$function$;

-- إنشاء trigger للطلبات
DROP TRIGGER IF EXISTS order_accounting_trigger ON orders;
CREATE TRIGGER order_accounting_trigger
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_accounting();

-- إضافة القيود المحاسبية للطلبات الموجودة
INSERT INTO account_entries (account_id, reference_type, reference_id, description, debit_amount, credit_amount, created_by)
SELECT 
    ar.id as account_id,
    'طلب' as reference_type,
    o.id as reference_id,
    'طلب رقم: ' || o.order_number || ' للعميل: ' || COALESCE(c.name, 'غير محدد') as description,
    o.amount as debit_amount,
    0 as credit_amount,
    o.created_by
FROM orders o
JOIN customers c ON o.customer_id = c.id
CROSS JOIN (SELECT id FROM accounts WHERE account_name = 'العملاء المدينون' AND account_type = 'أصول') ar
WHERE NOT EXISTS (
    SELECT 1 FROM account_entries ae 
    WHERE ae.reference_type = 'طلب' AND ae.reference_id = o.id AND ae.account_id = ar.id
);

-- إضافة قيود الإيرادات للطلبات الموجودة
INSERT INTO account_entries (account_id, reference_type, reference_id, description, debit_amount, credit_amount, created_by)
SELECT 
    rev.id as account_id,
    'طلب' as reference_type,
    o.id as reference_id,
    'إيراد من طلب رقم: ' || o.order_number || ' للعميل: ' || COALESCE(c.name, 'غير محدد') as description,
    0 as debit_amount,
    o.amount as credit_amount,
    o.created_by
FROM orders o
JOIN customers c ON o.customer_id = c.id
CROSS JOIN (
    SELECT id FROM accounts WHERE account_name = 'إيرادات المبيعات' AND account_type = 'إيرادات'
    UNION ALL
    SELECT id FROM (
        INSERT INTO accounts (account_name, account_type, description)
        VALUES ('إيرادات المبيعات', 'إيرادات', 'إيرادات من بيع الخدمات والمنتجات')
        ON CONFLICT DO NOTHING
        RETURNING id
    ) sub
    LIMIT 1
) rev
WHERE NOT EXISTS (
    SELECT 1 FROM account_entries ae 
    WHERE ae.reference_type = 'طلب' AND ae.reference_id = o.id AND ae.account_id = rev.id
);

-- مزامنة أرصدة العملاء المدينون
UPDATE accounts 
SET balance = calculate_accounts_receivable_balance(),
    updated_at = now()
WHERE account_name = 'العملاء المدينون';