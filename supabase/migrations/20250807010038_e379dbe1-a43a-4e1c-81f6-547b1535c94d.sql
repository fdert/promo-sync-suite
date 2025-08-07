-- حذف الـ triggers المتضاربة وإبقاء الصحيح فقط
DROP TRIGGER IF EXISTS send_evaluation_link_trigger ON orders;
DROP TRIGGER IF EXISTS order_notification_trigger ON orders;
DROP TRIGGER IF EXISTS advanced_order_notification_trigger ON orders;

-- إبقاء trigger واحد فقط للتقييم
CREATE OR REPLACE TRIGGER send_evaluation_trigger
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION send_evaluation_link_on_completion();