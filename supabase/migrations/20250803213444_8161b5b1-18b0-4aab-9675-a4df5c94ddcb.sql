-- تحديث صلاحيات جدول المصروفات للسماح للموظفين بإضافة مصروفات
DROP POLICY IF EXISTS "المدراء والمحاسبون يمكنهم إدارة ا" ON public.expenses;

-- إنشاء صلاحية جديدة تسمح للموظفين بإضافة وعرض المصروفات
CREATE POLICY "المدراء والمحاسبون والموظفون يمكنهم إدارة المصروفات" 
ON public.expenses 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'accountant'::app_role) OR 
  has_role(auth.uid(), 'employee'::app_role)
);