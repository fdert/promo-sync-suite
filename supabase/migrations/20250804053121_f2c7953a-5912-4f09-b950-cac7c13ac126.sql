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