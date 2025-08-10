-- إنشاء جدول الوكالات لنظام متعدد الوكالات
CREATE TABLE public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE, -- للوصول عبر URL فريد
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT DEFAULT '#64748b',
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  website TEXT,
  database_name TEXT, -- اختياري لعزل قواعد البيانات
  is_active BOOLEAN DEFAULT true,
  subscription_plan TEXT DEFAULT 'basic', -- basic, premium, enterprise
  max_users INTEGER DEFAULT 10,
  max_customers INTEGER DEFAULT 1000,
  max_storage_gb INTEGER DEFAULT 5,
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- إنشاء فهرس للبحث السريع
CREATE INDEX idx_agencies_slug ON public.agencies(slug);
CREATE INDEX idx_agencies_active ON public.agencies(is_active);

-- تفعيل RLS على جدول الوكالات
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- إنشاء جدول أعضاء الوكالة (Agency Members)
CREATE TABLE public.agency_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, manager, employee, member
  permissions JSONB DEFAULT '{}', -- صلاحيات إضافية مخصصة
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(agency_id, user_id)
);

-- تفعيل RLS على جدول أعضاء الوكالة
ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;

-- إنشاء جدول إعدادات الوكالة
CREATE TABLE public.agency_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agency_id, setting_key)
);

-- تفعيل RLS على جدول إعدادات الوكالة
ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;

-- دالة للحصول على وكالة المستخدم الحالي
CREATE OR REPLACE FUNCTION public.get_current_user_agency()
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT am.agency_id
  FROM public.agency_members am
  WHERE am.user_id = auth.uid() 
  AND am.is_active = true
  LIMIT 1;
$$;

-- دالة للتحقق من دور المستخدم في الوكالة
CREATE OR REPLACE FUNCTION public.has_agency_role(user_id_param UUID, role_param TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agency_members am
    WHERE am.user_id = user_id_param
    AND am.role = role_param
    AND am.is_active = true
  );
$$;

-- دالة للتحقق من عضوية المستخدم في وكالة معينة
CREATE OR REPLACE FUNCTION public.is_agency_member(user_id_param UUID, agency_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agency_members am
    WHERE am.user_id = user_id_param
    AND am.agency_id = agency_id_param
    AND am.is_active = true
  );
$$;

-- إنشاء سياسات RLS للوكالات
CREATE POLICY "المستخدمون يمكنهم رؤية وكالاتهم فقط"
ON public.agencies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members am
    WHERE am.agency_id = agencies.id
    AND am.user_id = auth.uid()
    AND am.is_active = true
  )
);

-- سياسة إنشاء وكالة جديدة (للمدراء فقط)
CREATE POLICY "المدراء يمكنهم إنشاء وكالات"
ON public.agencies
FOR INSERT
WITH CHECK (
  has_agency_role(auth.uid(), 'owner') OR 
  has_agency_role(auth.uid(), 'admin')
);

-- سياسة تحديث الوكالة
CREATE POLICY "أصحاب الوكالات يمكنهم تحديثها"
ON public.agencies
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members am
    WHERE am.agency_id = agencies.id
    AND am.user_id = auth.uid()
    AND am.role IN ('owner', 'admin')
    AND am.is_active = true
  )
);

-- إنشاء سياسات RLS لأعضاء الوكالة
CREATE POLICY "أعضاء الوكالة يمكنهم رؤية زملائهم"
ON public.agency_members
FOR SELECT
USING (
  agency_id = get_current_user_agency() OR
  user_id = auth.uid()
);

-- سياسة إضافة أعضاء جدد
CREATE POLICY "المدراء يمكنهم إضافة أعضاء"
ON public.agency_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agency_members am
    WHERE am.agency_id = agency_members.agency_id
    AND am.user_id = auth.uid()
    AND am.role IN ('owner', 'admin')
    AND am.is_active = true
  )
);

-- إنشاء سياسات RLS لإعدادات الوكالة
CREATE POLICY "أعضاء الوكالة يمكنهم رؤية الإعدادات"
ON public.agency_settings
FOR SELECT
USING (agency_id = get_current_user_agency());

CREATE POLICY "المدراء يمكنهم تحديث الإعدادات"
ON public.agency_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members am
    WHERE am.agency_id = agency_settings.agency_id
    AND am.user_id = auth.uid()
    AND am.role IN ('owner', 'admin')
    AND am.is_active = true
  )
);