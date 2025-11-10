-- إصلاح التحذير الأمني: تعيين search_path للدالة
-- حذف الـ trigger أولاً
DROP TRIGGER IF EXISTS update_employee_tasks_updated_at_trigger ON public.employee_tasks;

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS public.update_employee_tasks_updated_at();

-- إنشاء الدالة الجديدة مع search_path
CREATE OR REPLACE FUNCTION public.update_employee_tasks_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- إعادة إنشاء الـ trigger
CREATE TRIGGER update_employee_tasks_updated_at_trigger
BEFORE UPDATE ON public.employee_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_employee_tasks_updated_at();