-- إصلاح مشكلة RLS عند إنشاء طلب طباعة تلقائيًا
-- تحديث دالة إنشاء طلب الطباعة لتعيين created_by بشكل صحيح

CREATE OR REPLACE FUNCTION create_print_order_for_completed_order()
RETURNS TRIGGER AS $$
BEGIN
  -- إنشاء طلب طباعة جديد عندما يتم تحديث حالة الطلب إلى "مكتمل"
  IF NEW.status = 'مكتمل' AND (OLD.status IS NULL OR OLD.status != 'مكتمل') THEN
    INSERT INTO print_orders (
      order_id,
      print_order_number,
      status,
      quantity,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      'PRT-' || LPAD(nextval('print_order_seq')::text, 3, '0'),
      'pending',
      1,
      COALESCE(NEW.updated_by, NEW.created_by, auth.uid()),
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث سياسة RLS للسماح بإنشاء طلبات الطباعة من النظام
DROP POLICY IF EXISTS "المستخدمون يمكنهم إنشاء طلبات" ON print_orders;

CREATE POLICY "المستخدمون والنظام يمكنهم إنشاء طلبات" 
ON print_orders 
FOR INSERT 
WITH CHECK (
  created_by = auth.uid() OR 
  -- السماح للنظام بإنشاء طلبات تلقائيًا عند وجود مرجع صالح
  (created_by IS NOT NULL AND EXISTS (
    SELECT 1 FROM orders 
    WHERE id = print_orders.order_id 
    AND (created_by = auth.uid() OR updated_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin'::app_role, 'manager'::app_role, 'employee'::app_role])))
  ))
);