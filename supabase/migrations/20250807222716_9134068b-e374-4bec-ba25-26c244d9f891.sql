-- إنشاء trigger لتسجيل نشاط المستخدمين

-- دالة لتسجيل النشاط
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
DECLARE
    action_name TEXT;
    user_id_val UUID;
BEGIN
    -- تحديد نوع العملية
    IF TG_OP = 'INSERT' THEN
        action_name := 'create';
    ELSIF TG_OP = 'UPDATE' THEN
        action_name := 'update';
    ELSIF TG_OP = 'DELETE' THEN
        action_name := 'delete';
    END IF;
    
    -- الحصول على معرف المستخدم
    user_id_val := auth.uid();
    
    -- تسجيل النشاط
    INSERT INTO activity_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        details
    ) VALUES (
        user_id_val,
        action_name,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT
            ELSE NEW.id::TEXT
        END,
        CASE 
            WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
            ELSE row_to_json(NEW)
        END
    );
    
    RETURN CASE 
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة triggers للجداول المهمة
CREATE TRIGGER log_orders_activity
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION log_user_activity();

CREATE TRIGGER log_customers_activity
    AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW EXECUTE FUNCTION log_user_activity();

CREATE TRIGGER log_invoices_activity
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION log_user_activity();

CREATE TRIGGER log_payments_activity
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION log_user_activity();