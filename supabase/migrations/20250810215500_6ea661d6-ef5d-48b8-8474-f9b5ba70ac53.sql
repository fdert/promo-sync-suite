-- إنشاء دوال مساعدة لإدارة أعضاء الوكالة

-- دالة لإضافة عضو جديد بالإيميل
CREATE OR REPLACE FUNCTION public.add_agency_member_by_email(
  p_agency_id UUID,
  p_user_email TEXT,
  p_role TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  existing_member_id UUID;
  new_member_id UUID;
BEGIN
  -- البحث عن المستخدم بالإيميل
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = p_user_email
  AND email_confirmed_at IS NOT NULL;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'المستخدم غير موجود في النظام أو لم يتم تأكيد بريده الإلكتروني';
  END IF;
  
  -- التحقق من عدم وجود العضو مسبقاً
  SELECT id INTO existing_member_id
  FROM agency_members
  WHERE agency_id = p_agency_id
  AND user_id = target_user_id
  AND is_active = true;
  
  IF existing_member_id IS NOT NULL THEN
    RAISE EXCEPTION 'المستخدم عضو في الوكالة بالفعل';
  END IF;
  
  -- إضافة العضو الجديد
  INSERT INTO agency_members (agency_id, user_id, role, created_by)
  VALUES (p_agency_id, target_user_id, p_role, auth.uid())
  RETURNING id INTO new_member_id;
  
  RETURN new_member_id;
END;
$$;

-- دالة للحصول على أعضاء الوكالة مع بيانات المستخدمين
CREATE OR REPLACE FUNCTION public.get_agency_members_with_user_data(
  p_agency_id UUID
)
RETURNS TABLE (
  id UUID,
  agency_id UUID,
  user_id UUID,
  role TEXT,
  permissions JSONB,
  is_active BOOLEAN,
  joined_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  user_info JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    am.id,
    am.agency_id,
    am.user_id,
    am.role,
    am.permissions,
    am.is_active,
    am.joined_at,
    am.created_by,
    jsonb_build_object(
      'full_name', COALESCE(au.raw_user_meta_data->>'full_name', 'مستخدم'),
      'email', COALESCE(au.email, 'بدون بريد إلكتروني')
    ) as user_info
  FROM agency_members am
  LEFT JOIN auth.users au ON am.user_id = au.id
  WHERE am.agency_id = p_agency_id
  AND am.is_active = true
  ORDER BY 
    CASE am.role
      WHEN 'owner' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'manager' THEN 3
      WHEN 'employee' THEN 4
      ELSE 5
    END,
    am.joined_at ASC;
END;
$$;