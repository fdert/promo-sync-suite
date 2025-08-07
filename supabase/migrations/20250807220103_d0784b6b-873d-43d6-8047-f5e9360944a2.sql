-- تحديث جميع العملاء الحاليين الذين ليس لديهم رقم واتساب
UPDATE customers 
SET whatsapp_number = phone 
WHERE whatsapp_number IS NULL AND phone IS NOT NULL;

-- إنشاء دالة لتحديث رقم الواتساب تلقائياً للعملاء الجدد
CREATE OR REPLACE FUNCTION public.auto_set_whatsapp_number()
RETURNS TRIGGER AS $$
BEGIN
  -- إذا لم يتم تحديد رقم واتساب ولكن يوجد رقم جوال، اعتبر رقم الجوال هو رقم الواتساب
  IF NEW.whatsapp_number IS NULL AND NEW.phone IS NOT NULL THEN
    NEW.whatsapp_number := NEW.phone;
  END IF;
  
  -- إذا تم تحديث رقم الجوال ولم يكن هناك رقم واتساب منفصل، حدث رقم الواتساب أيضاً
  IF TG_OP = 'UPDATE' AND NEW.phone IS DISTINCT FROM OLD.phone AND NEW.whatsapp_number = OLD.phone THEN
    NEW.whatsapp_number := NEW.phone;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger للعملاء الجدد والتحديثات
DROP TRIGGER IF EXISTS set_whatsapp_number_trigger ON customers;
CREATE TRIGGER set_whatsapp_number_trigger
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_whatsapp_number();