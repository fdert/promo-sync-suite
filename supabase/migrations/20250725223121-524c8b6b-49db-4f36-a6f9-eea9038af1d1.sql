-- إنشاء نظام إدارة المستخدمين والصلاحيات

-- تحديث جدول الملفات الشخصية
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- إنشاء جدول الصلاحيات المفصلة
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, permission)
);

-- تفعيل RLS على جدول الصلاحيات
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لجدول الصلاحيات
CREATE POLICY "المدراء يمكنهم إدارة الصلاحيات" 
ON public.user_permissions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "المستخدمون يمكنهم رؤية صلاحياتهم" 
ON public.user_permissions 
FOR SELECT 
USING (user_id = auth.uid());

-- تحديث دالة إنشاء المستخدم الجديد
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- إنشاء ملف شخصي جديد مع حالة انتظار
  INSERT INTO public.profiles (id, full_name, status)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', 'pending');
  
  -- إعطاء دور مستخدم عادي مع حالة انتظار
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- إنشاء trigger لإنشاء المستخدمين الجدد
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- دالة للتحقق من الصلاحيات المفصلة
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_permissions 
    WHERE user_id = _user_id AND permission = _permission
  )
$$;

-- دالة لتحديث آخر دخول
CREATE OR REPLACE FUNCTION public.update_last_login(_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  UPDATE public.profiles 
  SET last_login = now() 
  WHERE id = _user_id;
$$;

-- تحديث سياسات الأمان للملفات الشخصية
DROP POLICY IF EXISTS "المدراء يمكنهم رؤية جميع الملفات" ON public.profiles;
CREATE POLICY "المدراء يمكنهم رؤية جميع الملفات الشخصية" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "المدراء يمكنهم تحديث الملفات الشخصية" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- السماح للمدراء بتحديث حالة المستخدمين
CREATE POLICY "المدراء يمكنهم تحديث حالة المستخدمين" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));