-- إنشاء view لحساب أرصدة العملاء من الطلبات
CREATE OR REPLACE VIEW customer_order_balances AS
SELECT 
    c.id as customer_id,
    c.name as customer_name,
    COALESCE(SUM(o.amount), 0) as total_orders_amount,
    COALESCE(SUM(COALESCE(p.total_payments, 0)), 0) as total_paid_amount,
    COALESCE(SUM(o.amount), 0) - COALESCE(SUM(COALESCE(p.total_payments, 0)), 0) as outstanding_balance,
    COUNT(o.id) as total_orders_count,
    COUNT(CASE WHEN (o.amount - COALESCE(p.total_payments, 0)) > 0 THEN 1 END) as unpaid_orders_count,
    MIN(o.due_date) as earliest_due_date,
    MAX(o.due_date) as latest_due_date,
    MAX(o.created_at) as last_order_date
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
LEFT JOIN (
    SELECT 
        order_id,
        SUM(amount) as total_payments
    FROM payments 
    WHERE order_id IS NOT NULL
    GROUP BY order_id
) p ON o.id = p.order_id
GROUP BY c.id, c.name
HAVING COALESCE(SUM(o.amount), 0) - COALESCE(SUM(COALESCE(p.total_payments, 0)), 0) > 0
ORDER BY outstanding_balance DESC;

-- تحديث حساب العملاء المدينون بناءً على الطلبات
CREATE OR REPLACE FUNCTION calculate_accounts_receivable_from_orders()
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    total_outstanding NUMERIC := 0;
BEGIN
    -- حساب إجمالي الأرصدة المستحقة من الطلبات
    SELECT COALESCE(SUM(outstanding_balance), 0)
    INTO total_outstanding
    FROM customer_order_balances;
    
    RETURN total_outstanding;
END;
$$;

-- إنشاء دالة لإنشاء قيود محاسبية للطلبات
CREATE OR REPLACE FUNCTION create_order_accounting_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
        -- إذا تغير المبلغ الإجمالي، نحديث القيود
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
$$;

-- إنشاء دالة لتحديث قيود المدفوعات للطلبات
CREATE OR REPLACE FUNCTION handle_order_payment_accounting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    cash_account_id UUID;
    bank_account_id UUID;
    network_account_id UUID;
    accounts_receivable_id UUID;
    payment_account_id UUID;
    customer_name TEXT;
    order_number TEXT;
BEGIN
    -- في حالة إنشاء دفعة جديدة للطلب
    IF TG_OP = 'INSERT' AND NEW.order_id IS NOT NULL THEN
        -- البحث عن الحسابات
        SELECT id INTO cash_account_id FROM accounts WHERE account_name = 'النقدية' AND account_type = 'أصول';
        SELECT id INTO bank_account_id FROM accounts WHERE account_name = 'البنك' AND account_type = 'أصول';
        SELECT id INTO network_account_id FROM accounts WHERE account_name = 'الشبكة' AND account_type = 'أصول';
        SELECT id INTO accounts_receivable_id FROM accounts WHERE account_name = 'العملاء المدينون' AND account_type = 'أصول';
        
        -- تحديد الحساب المناسب حسب نوع الدفع
        CASE 
            WHEN NEW.payment_type IN ('نقدي', 'كاش', 'Cash') THEN
                payment_account_id := cash_account_id;
            WHEN NEW.payment_type IN ('تحويل بنكي', 'Bank Transfer', 'بنك') THEN
                payment_account_id := bank_account_id;
            WHEN NEW.payment_type IN ('الشبكة', 'شبكة', 'Network') THEN
                payment_account_id := network_account_id;
            ELSE
                payment_account_id := cash_account_id; -- افتراضي
        END CASE;
        
        -- جلب معلومات الطلب والعميل
        SELECT o.order_number, c.name
        INTO order_number, customer_name
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.id = NEW.order_id;
        
        -- إنشاء القيد المحاسبي (مدين في حساب الأصل)
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
            'استلام دفعة ' || NEW.payment_type || ' من العميل: ' || COALESCE(customer_name, 'غير محدد') || ' للطلب: ' || COALESCE(order_number, 'غير محدد'),
            'دفعة_طلب',
            NEW.id,
            NEW.created_by
        );
        
        -- إنشاء قيد دائن للعملاء المدينون (تقليل الدين)
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
            'استلام دفعة ' || NEW.payment_type || ' من العميل: ' || COALESCE(customer_name, 'غير محدد') || ' للطلب: ' || COALESCE(order_number, 'غير محدد'),
            'دفعة_طلب',
            NEW.id,
            NEW.created_by
        );
        
        RETURN NEW;
    END IF;
    
    -- في حالة حذف الدفعة
    IF TG_OP = 'DELETE' AND OLD.order_id IS NOT NULL THEN
        -- حذف القيود المحاسبية المرتبطة
        DELETE FROM account_entries
        WHERE reference_type = 'دفعة_طلب' AND reference_id = OLD.id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

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

-- إنشاء trigger لمزامنة الأرصدة بعد تغيير المدفوعات
DROP TRIGGER IF EXISTS sync_accounts_after_order_payment ON payments;
CREATE TRIGGER sync_accounts_after_order_payment
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION sync_accounts_receivable_from_orders;

-- تحديث البيانات الموجودة لتكون متسقة مع النظام الجديد
-- إنشاء قيود محاسبية للطلبات الموجودة
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
    WHERE ae.reference_type = 'طلب' AND ae.reference_id = o.id
);

-- إنشاء قيود الإيرادات للطلبات الموجودة
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
CROSS JOIN (SELECT id FROM accounts WHERE account_name = 'إيرادات المبيعات' AND account_type = 'إيرادات') rev
WHERE NOT EXISTS (
    SELECT 1 FROM account_entries ae 
    WHERE ae.reference_type = 'طلب' AND ae.reference_id = o.id AND ae.account_id = rev.id
);

-- إنشاء قيود المدفوعات للطلبات الموجودة
INSERT INTO account_entries (account_id, reference_type, reference_id, description, debit_amount, credit_amount, created_by)
SELECT 
    CASE 
        WHEN p.payment_type = 'نقدي' THEN cash.id
        WHEN p.payment_type = 'تحويل بنكي' THEN bank.id
        WHEN p.payment_type = 'الشبكة' THEN network.id
        ELSE cash.id
    END as account_id,
    'دفعة_طلب' as reference_type,
    p.id as reference_id,
    'استلام دفعة ' || p.payment_type || ' من العميل: ' || COALESCE(c.name, 'غير محدد') || ' للطلب: ' || COALESCE(o.order_number, 'غير محدد') as description,
    p.amount as debit_amount,
    0 as credit_amount,
    p.created_by
FROM payments p
JOIN orders o ON p.order_id = o.id
JOIN customers c ON o.customer_id = c.id
CROSS JOIN (SELECT id FROM accounts WHERE account_name = 'النقدية' AND account_type = 'أصول') cash
CROSS JOIN (SELECT id FROM accounts WHERE account_name = 'البنك' AND account_type = 'أصول') bank
CROSS JOIN (SELECT id FROM accounts WHERE account_name = 'الشبكة' AND account_type = 'أصول') network
WHERE p.order_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM account_entries ae 
    WHERE ae.reference_type = 'دفعة_طلب' AND ae.reference_id = p.id
);

-- إنشاء قيود العملاء المدينون للمدفوعات
INSERT INTO account_entries (account_id, reference_type, reference_id, description, debit_amount, credit_amount, created_by)
SELECT 
    ar.id as account_id,
    'دفعة_طلب' as reference_type,
    p.id as reference_id,
    'استلام دفعة ' || p.payment_type || ' من العميل: ' || COALESCE(c.name, 'غير محدد') || ' للطلب: ' || COALESCE(o.order_number, 'غير محدد') as description,
    0 as debit_amount,
    p.amount as credit_amount,
    p.created_by
FROM payments p
JOIN orders o ON p.order_id = o.id
JOIN customers c ON o.customer_id = c.id
CROSS JOIN (SELECT id FROM accounts WHERE account_name = 'العملاء المدينون' AND account_type = 'أصول') ar
WHERE p.order_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM account_entries ae 
    WHERE ae.reference_type = 'دفعة_طلب' AND ae.reference_id = p.id AND ae.account_id = ar.id
);

-- مزامنة أرصدة العملاء المدينون
SELECT sync_accounts_receivable_from_orders();