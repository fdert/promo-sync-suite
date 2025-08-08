-- Fix the log_user_activity function to handle null user_id cases
CREATE OR REPLACE FUNCTION public.log_user_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    
    -- تسجيل النشاط فقط إذا كان هناك مستخدم مصرح له
    IF user_id_val IS NOT NULL THEN
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
    END IF;
    
    RETURN CASE 
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$;

-- Now clean WhatsApp numbers with invisible Unicode characters
UPDATE customers 
SET whatsapp_number = REGEXP_REPLACE(whatsapp_number, '[^\+0-9]', '', 'g'),
    phone = REGEXP_REPLACE(phone, '[^\+0-9]', '', 'g')
WHERE whatsapp_number ~ '[^\+0-9]' OR phone ~ '[^\+0-9]';

-- Add a function to clean phone numbers on insert/update
CREATE OR REPLACE FUNCTION clean_phone_numbers()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Clean WhatsApp number from any non-digit/plus characters
  IF NEW.whatsapp_number IS NOT NULL THEN
    NEW.whatsapp_number := REGEXP_REPLACE(NEW.whatsapp_number, '[^\+0-9]', '', 'g');
  END IF;
  
  -- Clean phone number from any non-digit/plus characters  
  IF NEW.phone IS NOT NULL THEN
    NEW.phone := REGEXP_REPLACE(NEW.phone, '[^\+0-9]', '', 'g');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add trigger to clean phone numbers automatically
DROP TRIGGER IF EXISTS clean_phone_numbers_trigger ON customers;
CREATE TRIGGER clean_phone_numbers_trigger
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION clean_phone_numbers();