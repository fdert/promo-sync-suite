-- Add resource_type and resource_id columns to user_activity_logs
ALTER TABLE public.user_activity_logs
ADD COLUMN IF NOT EXISTS resource_type text,
ADD COLUMN IF NOT EXISTS resource_id uuid;

-- Update log_activity function to populate new columns
CREATE OR REPLACE FUNCTION public.log_activity(
  _action text,
  _resource_type text,
  _resource_id uuid,
  _details jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN;
  END IF;

  -- ensure profile exists to satisfy FK
  INSERT INTO public.profiles (id)
  SELECT uid
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = uid);

  INSERT INTO public.user_activity_logs (
    user_id, 
    action, 
    resource_type, 
    resource_id, 
    details, 
    ip_address, 
    user_agent
  )
  VALUES (
    uid,
    _action,
    _resource_type,
    _resource_id,
    COALESCE(_details, '{}'::jsonb),
    current_setting('request.headers', true)::json->>'x-forwarded-for',
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$$;