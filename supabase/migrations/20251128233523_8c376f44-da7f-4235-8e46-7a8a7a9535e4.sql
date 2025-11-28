-- إنشاء جدول لتخزين مفاتيح API
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- إنشاء فهرس لتسريع البحث
CREATE INDEX idx_api_keys_key ON public.api_keys(api_key) WHERE is_active = true;

-- تفعيل RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- سياسة للمشرفين فقط
CREATE POLICY "Admins can manage API keys"
ON public.api_keys
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- إنشاء جدول لتسجيل استخدام API
CREATE TABLE IF NOT EXISTS public.api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_body JSONB,
  response_status INTEGER,
  response_time_ms INTEGER,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهرس لتسريع الاستعلامات
CREATE INDEX idx_api_logs_key_id ON public.api_logs(api_key_id);
CREATE INDEX idx_api_logs_created_at ON public.api_logs(created_at);

-- تفعيل RLS
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- سياسة للمشرفين فقط
CREATE POLICY "Admins can view API logs"
ON public.api_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- دالة للتحقق من صلاحية API key
CREATE OR REPLACE FUNCTION public.validate_api_key(key TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  api_key_id UUID,
  permissions JSONB
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;