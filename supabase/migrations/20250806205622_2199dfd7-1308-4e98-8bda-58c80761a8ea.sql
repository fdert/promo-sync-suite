-- تعديل سياسات الأمان لجدول services للسماح للموظفين بالإضافة والتحديث

-- حذف السياسة الحالية التي تسمح للمدراء فقط
DROP POLICY IF EXISTS "المدراء فقط يمكنهم إدارة الخدمات" ON services;

-- إنشاء سياسات جديدة أكثر مرونة

-- سياسة للعرض: الجميع يمكنهم رؤية الخدمات النشطة، والمدراء والموظفون يمكنهم رؤية جميع الخدمات
CREATE POLICY "المدراء والموظفون يمكنهم رؤية جميع الخدمات" 
ON services 
FOR SELECT 
USING (
  (is_active = true) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'employee'::app_role)
);

-- سياسة للإضافة: المدراء والموظفون يمكنهم إضافة خدمات
CREATE POLICY "المدراء والموظفون يمكنهم إضافة خدمات" 
ON services 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'employee'::app_role)
);

-- سياسة للتحديث: المدراء والموظفون يمكنهم تحديث الخدمات
CREATE POLICY "المدراء والموظفون يمكنهم تحديث الخدمات" 
ON services 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'employee'::app_role)
);

-- سياسة للحذف: المدراء فقط يمكنهم حذف الخدمات
CREATE POLICY "المدراء فقط يمكنهم حذف الخدمات" 
ON services 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);