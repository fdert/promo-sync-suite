-- إنشاء view لأرصدة العملاء من الطلبات
CREATE OR REPLACE VIEW customer_order_balances AS
SELECT 
    c.id as customer_id,
    c.name as customer_name,
    COALESCE(SUM(o.amount), 0) as total_order_amount,
    COALESCE(SUM(p.paid_amount), 0) as total_paid_amount,
    COALESCE(SUM(o.amount), 0) - COALESCE(SUM(p.paid_amount), 0) as outstanding_balance,
    COUNT(DISTINCT o.id) as total_orders,
    COUNT(DISTINCT CASE WHEN (COALESCE(o.amount, 0) - COALESCE(p.paid_amount, 0)) > 0 THEN o.id END) as unpaid_orders_count,
    MIN(o.due_date) as earliest_due_date,
    MAX(o.due_date) as latest_due_date
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
LEFT JOIN (
    SELECT 
        order_id,
        SUM(amount) as paid_amount
    FROM payments 
    WHERE order_id IS NOT NULL
    GROUP BY order_id
) p ON o.id = p.order_id
GROUP BY c.id, c.name
HAVING COALESCE(SUM(o.amount), 0) - COALESCE(SUM(p.paid_amount), 0) > 0
ORDER BY outstanding_balance DESC;

-- دالة لحساب رصيد العملاء المدينين من الطلبات
CREATE OR REPLACE FUNCTION calculate_customer_order_balance(customer_id_param uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_orders_amount numeric := 0;
    total_payments_amount numeric := 0;
    outstanding_balance numeric := 0;
BEGIN
    -- حساب إجمالي مبالغ الطلبات للعميل
    SELECT COALESCE(SUM(amount), 0)
    INTO total_orders_amount
    FROM orders
    WHERE customer_id = customer_id_param;
    
    -- حساب إجمالي المدفوعات للطلبات
    SELECT COALESCE(SUM(p.amount), 0)
    INTO total_payments_amount
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE o.customer_id = customer_id_param;
    
    outstanding_balance := total_orders_amount - total_payments_amount;
    
    RETURN outstanding_balance;
END;
$$;

-- دالة لحساب إجمالي العملاء المدينين من الطلبات
CREATE OR REPLACE FUNCTION calculate_total_customer_orders_receivable()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_receivable numeric := 0;
BEGIN
    SELECT COALESCE(SUM(outstanding_balance), 0)
    INTO total_receivable
    FROM customer_order_balances;
    
    RETURN total_receivable;
END;
$$;

-- تحديث دالة المحاسبة للمدفوعات المرتبطة بالطلبات
CREATE OR REPLACE FUNCTION create_order_payment_accounting_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cash_account_id UUID;
    bank_account_id UUID;
    network_account_id UUID;
    customer_orders_receivable_id UUID;
    payment_account_id UUID;
    customer_name TEXT;
    order_number TEXT;
BEGIN
    -- البحث عن الحسابات
    SELECT id INTO cash_account_id FROM accounts WHERE account_name = 'النقدية' AND account_type = 'أصول' LIMIT 1;
    SELECT id INTO bank_account_id FROM accounts WHERE account_name = 'البنك' AND account_type = 'أصول' LIMIT 1;
    SELECT id INTO network_account_id FROM accounts WHERE account_name = 'الشبكة' AND account_type = 'أصول' LIMIT 1;
    
    -- البحث عن حساب العملاء المدينين من الطلبات أو إنشاؤه
    SELECT id INTO customer_orders_receivable_id 
    FROM accounts 
    WHERE account_name = 'العملاء المدينون - الطلبات' AND account_type = 'أصول' LIMIT 1;
    
    IF customer_orders_receivable_id IS NULL THEN
        INSERT INTO accounts (account_name, account_type, description)
        VALUES ('العملاء المدينون - الطلبات', 'أصول', 'مديونية العملاء من الطلبات')
        RETURNING id INTO customer_orders_receivable_id;
    END IF;
    
    -- تحديد الحساب حسب نوع الدفع
    CASE 
        WHEN NEW.payment_type = 'نقدي' THEN payment_account_id := cash_account_id;
        WHEN NEW.payment_type = 'تحويل بنكي' THEN payment_account_id := bank_account_id;
        WHEN NEW.payment_type = 'الشبكة' THEN payment_account_id := network_account_id;
        ELSE payment_account_id := cash_account_id;
    END CASE;
    
    -- جلب معلومات العميل والطلب إذا كانت مرتبطة بطلب
    IF NEW.order_id IS NOT NULL THEN
        SELECT o.order_number, c.name
        INTO order_number, customer_name
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.id = NEW.order_id;
        
        -- حذف القيود القديمة للمدفوعات المرتبطة بالطلبات
        DELETE FROM account_entries 
        WHERE reference_type = 'دفعة طلب' AND reference_id = NEW.id;
        
        -- إنشاء قيد مدين لحساب الأصل
        INSERT INTO account_entries (
            account_id, debit_amount, credit_amount, description, reference_type, reference_id, created_by
        ) VALUES (
            payment_account_id, NEW.amount, 0,
            'استلام دفعة ' || NEW.payment_type || ' من العميل: ' || COALESCE(customer_name, 'غير محدد') || ' للطلب: ' || COALESCE(order_number, 'غير محدد'),
            'دفعة طلب', NEW.id, COALESCE(NEW.created_by, auth.uid())
        );
        
        -- إنشاء قيد دائن للعملاء المدينون من الطلبات
        INSERT INTO account_entries (
            account_id, debit_amount, credit_amount, description, reference_type, reference_id, created_by
        ) VALUES (
            customer_orders_receivable_id, 0, NEW.amount,
            'استلام دفعة ' || NEW.payment_type || ' من العميل: ' || COALESCE(customer_name, 'غير محدد') || ' للطلب: ' || COALESCE(order_number, 'غير محدد'),
            'دفعة طلب', NEW.id, COALESCE(NEW.created_by, auth.uid())
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- إنشاء trigger للمدفوعات المرتبطة بالطلبات
DROP TRIGGER IF EXISTS trigger_order_payment_accounting ON payments;
CREATE TRIGGER trigger_order_payment_accounting
    AFTER INSERT OR UPDATE ON payments
    FOR EACH ROW
    WHEN (NEW.order_id IS NOT NULL)
    EXECUTE FUNCTION create_order_payment_accounting_entry();

-- دالة لإنشاء القيود المحاسبية للطلبات
CREATE OR REPLACE FUNCTION create_order_accounting_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    revenue_account_id UUID;
    customer_orders_receivable_id UUID;
    customer_name TEXT;
BEGIN
    -- جلب اسم العميل
    SELECT name INTO customer_name
    FROM customers
    WHERE id = NEW.customer_id;
    
    -- البحث عن حساب الإيرادات أو إنشاؤه
    SELECT id INTO revenue_account_id 
    FROM accounts 
    WHERE account_name = 'إيرادات الطلبات' AND account_type = 'إيرادات';
    
    IF revenue_account_id IS NULL THEN
        INSERT INTO accounts (account_name, account_type, description)
        VALUES ('إيرادات الطلبات', 'إيرادات', 'إيرادات من الطلبات والخدمات')
        RETURNING id INTO revenue_account_id;
    END IF;
    
    -- البحث عن حساب العملاء المدينون من الطلبات أو إنشاؤه
    SELECT id INTO customer_orders_receivable_id 
    FROM accounts 
    WHERE account_name = 'العملاء المدينون - الطلبات' AND account_type = 'أصول';
    
    IF customer_orders_receivable_id IS NULL THEN
        INSERT INTO accounts (account_name, account_type, description)
        VALUES ('العملاء المدينون - الطلبات', 'أصول', 'مديونية العملاء من الطلبات')
        RETURNING id INTO customer_orders_receivable_id;
    END IF;
    
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
            customer_orders_receivable_id,
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
            AND account_id = customer_orders_receivable_id;
            
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

-- إنشاء trigger للطلبات
DROP TRIGGER IF EXISTS trigger_order_accounting ON orders;
CREATE TRIGGER trigger_order_accounting
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION create_order_accounting_entry();