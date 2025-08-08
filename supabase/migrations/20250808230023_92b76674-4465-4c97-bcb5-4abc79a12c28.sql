-- Fix WhatsApp numbers with invisible Unicode characters
-- Clean up phone numbers that have invisible Unicode characters

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