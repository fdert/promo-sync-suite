-- إصلاح مشكلة search_path في دالة التحقق من API key
CREATE OR REPLACE FUNCTION public.validate_api_key(key TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  api_key_id UUID,
  permissions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (k.is_active AND (k.expires_at IS NULL OR k.expires_at > NOW()))::BOOLEAN,
    k.id,
    k.permissions
  FROM public.api_keys k
  WHERE k.api_key = key;
  
  -- تحديث آخر استخدام
  UPDATE public.api_keys
  SET last_used_at = NOW()
  WHERE api_key = key;
END;
$$;