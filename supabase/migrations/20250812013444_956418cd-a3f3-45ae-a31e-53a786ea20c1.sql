-- تحديث دالة get_current_user_agency للعمل مع الوكالة الافتراضية
CREATE OR REPLACE FUNCTION public.get_current_user_agency()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT am.agency_id
     FROM public.agency_members am
     WHERE am.user_id = auth.uid() 
     AND am.is_active = true
     LIMIT 1),
    (SELECT id FROM public.agencies WHERE slug = 'default-agency' LIMIT 1)
  );
$$;