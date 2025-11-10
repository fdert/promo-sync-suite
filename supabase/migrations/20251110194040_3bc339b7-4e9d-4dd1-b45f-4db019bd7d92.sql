-- إنشاء جدول المهام الخاصة للموظفين
CREATE TABLE IF NOT EXISTS public.employee_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'other',
  task_date DATE NOT NULL,
  task_time TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID NOT NULL REFERENCES auth.users(id),
  order_id UUID REFERENCES public.orders(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_employee_tasks_assigned_to ON public.employee_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_created_by ON public.employee_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_task_date ON public.employee_tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_status ON public.employee_tasks(status);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_order_id ON public.employee_tasks(order_id);

-- تفعيل Row Level Security
ALTER TABLE public.employee_tasks ENABLE ROW LEVEL SECURITY;

-- سياسة للقراءة: الموظفون يمكنهم رؤية المهام المعينة لهم أو المهام التي أنشأوها
CREATE POLICY "Employees can view their assigned or created tasks"
ON public.employee_tasks
FOR SELECT
USING (
  auth.uid() = assigned_to OR 
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- سياسة للإضافة: الموظفون يمكنهم إضافة مهام لأنفسهم
CREATE POLICY "Employees can create tasks for themselves"
ON public.employee_tasks
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
);

-- سياسة للتعديل: الموظفون يمكنهم تعديل مهامهم
CREATE POLICY "Employees can update their own tasks"
ON public.employee_tasks
FOR UPDATE
USING (
  auth.uid() = assigned_to OR 
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- سياسة للحذف: الموظفون يمكنهم حذف المهام التي أنشأوها
CREATE POLICY "Employees can delete their own created tasks"
ON public.employee_tasks
FOR DELETE
USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- إنشاء trigger لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION public.update_employee_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employee_tasks_updated_at_trigger
BEFORE UPDATE ON public.employee_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_employee_tasks_updated_at();