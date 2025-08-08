-- Phase 1: Critical Role Security Fixes

-- Create secure role management system
-- First, create a function to check if user can assign roles (only admins)
CREATE OR REPLACE FUNCTION public.can_assign_roles(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins can assign roles
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = can_assign_roles.user_id 
    AND role = 'admin'
  );
END;
$$;

-- Create secure function to assign roles
CREATE OR REPLACE FUNCTION public.assign_user_role(target_user_id uuid, new_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Check if current user can assign roles
  IF NOT public.can_assign_roles(current_user_id) THEN
    RAISE EXCEPTION 'غير مصرح لك بتعيين الأدوار';
  END IF;
  
  -- Insert the new role (will be ignored if already exists due to unique constraint)
  INSERT INTO user_roles (user_id, role)
  VALUES (target_user_id, new_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log the role assignment
  INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details)
  VALUES (
    current_user_id,
    'role_assigned',
    'user_roles',
    target_user_id::text,
    jsonb_build_object(
      'target_user_id', target_user_id,
      'role_assigned', new_role,
      'assigned_by', current_user_id
    )
  );
  
  RETURN true;
END;
$$;

-- Create secure function to remove roles
CREATE OR REPLACE FUNCTION public.remove_user_role(target_user_id uuid, old_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Check if current user can assign roles
  IF NOT public.can_assign_roles(current_user_id) THEN
    RAISE EXCEPTION 'غير مصرح لك بإزالة الأدوار';
  END IF;
  
  -- Prevent removing admin role from self if it's the last admin
  IF old_role = 'admin' AND target_user_id = current_user_id THEN
    IF (SELECT COUNT(*) FROM user_roles WHERE role = 'admin') <= 1 THEN
      RAISE EXCEPTION 'لا يمكن إزالة دور المدير الأخير';
    END IF;
  END IF;
  
  -- Remove the role
  DELETE FROM user_roles 
  WHERE user_id = target_user_id AND role = old_role;
  
  -- Log the role removal
  INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details)
  VALUES (
    current_user_id,
    'role_removed',
    'user_roles',
    target_user_id::text,
    jsonb_build_object(
      'target_user_id', target_user_id,
      'role_removed', old_role,
      'removed_by', current_user_id
    )
  );
  
  RETURN true;
END;
$$;

-- Update has_role function to include search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;