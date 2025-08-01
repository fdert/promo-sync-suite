-- Update the order notification trigger to call the edge function directly
DROP TRIGGER IF EXISTS order_notification_trigger ON orders;
DROP FUNCTION IF EXISTS send_order_notification();

-- Create the updated notification function
CREATE OR REPLACE FUNCTION send_order_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    customer_record RECORD;
    notification_type TEXT;
    order_data JSONB;
BEGIN
    -- Get customer information
    SELECT name, whatsapp_number, phone INTO customer_record
    FROM customers 
    WHERE id = COALESCE(NEW.customer_id, OLD.customer_id);
    
    -- Skip if no WhatsApp number
    IF customer_record.whatsapp_number IS NULL OR customer_record.whatsapp_number = '' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Determine notification type based on operation and status
    IF TG_OP = 'INSERT' THEN
        notification_type := 'order_created';
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        CASE NEW.status
            WHEN 'مؤكد' THEN
                notification_type := 'order_confirmed';
            WHEN 'قيد التنفيذ' THEN
                notification_type := 'order_in_progress';
            WHEN 'قيد المراجعة' THEN
                notification_type := 'order_under_review';
            WHEN 'جاهز للتسليم' THEN
                notification_type := 'order_ready_for_delivery';
            WHEN 'مكتمل' THEN
                notification_type := 'order_completed';
            WHEN 'ملغي' THEN
                notification_type := 'order_cancelled';
            WHEN 'قيد الانتظار' THEN
                notification_type := 'order_on_hold';
            ELSE
                notification_type := 'order_updated';
        END CASE;
    ELSE
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Prepare order data
    order_data := jsonb_build_object(
        'order_number', COALESCE(NEW.order_number, OLD.order_number),
        'customer_name', customer_record.name,
        'customer_phone', customer_record.whatsapp_number,
        'amount', COALESCE(NEW.amount, OLD.amount),
        'progress', COALESCE(NEW.progress, OLD.progress, 0),
        'service_name', COALESCE(NEW.service_name, OLD.service_name),
        'description', COALESCE(NEW.description, OLD.description),
        'payment_type', COALESCE(NEW.payment_type, OLD.payment_type),
        'paid_amount', COALESCE(NEW.paid_amount, OLD.paid_amount, 0),
        'status', COALESCE(NEW.status, OLD.status),
        'priority', COALESCE(NEW.priority, OLD.priority),
        'due_date', COALESCE(NEW.due_date, OLD.due_date),
        'start_date', COALESCE(NEW.start_date, OLD.start_date)
    );
    
    -- Call the edge function to send notification
    PERFORM net.http_post(
        url := 'https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/send-order-notifications',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT value FROM vault.secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
        ),
        body := jsonb_build_object(
            'type', notification_type,
            'order_id', COALESCE(NEW.id, OLD.id),
            'data', order_data
        )::text
    );
    
    RETURN COALESCE(NEW, OLD);
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the order operation
        RAISE LOG 'Error sending order notification: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create the trigger
CREATE TRIGGER order_notification_trigger
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION send_order_notification();