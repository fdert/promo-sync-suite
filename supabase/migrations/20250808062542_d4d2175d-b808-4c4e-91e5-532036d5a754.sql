-- Phase 1 Continued: Secure user_roles RLS policies

-- Drop existing policies and recreate with secure access
DROP POLICY IF EXISTS "المدراء والموظفون يمكنهم إدارة الأدوار" ON user_roles;

-- Only allow viewing roles for admins/managers and users viewing their own roles
CREATE POLICY "المدراء يمكنهم رؤية جميع الأدوار"
ON user_roles FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager')
);

CREATE POLICY "المستخدمون يمكنهم رؤية أدوارهم فقط"
ON user_roles FOR SELECT
USING (user_id = auth.uid());

-- NO direct INSERT/UPDATE/DELETE policies - only through secure functions
-- This prevents privilege escalation

-- Fix other database functions with search_path
-- Update all existing SECURITY DEFINER functions to include search_path

-- Fix auto_set_whatsapp_number function
CREATE OR REPLACE FUNCTION public.auto_set_whatsapp_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Fix log_user_activity function
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
$$;