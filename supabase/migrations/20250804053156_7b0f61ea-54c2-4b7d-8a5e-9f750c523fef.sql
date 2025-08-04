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