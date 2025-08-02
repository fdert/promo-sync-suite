-- إصلاح نهائي لمشكلة RLS في print_orders
-- تحديث السياسات لتكون أكثر مرونة

-- حذف السياسة الحالية
DROP POLICY IF EXISTS "المستخدمون والنظام يمكنهم إنشاء طلبات" ON print_orders;

-- إنشاء سياسة جديدة أكثر مرونة
CREATE POLICY "السماح بإنشاء طلبات الطباعة" 
ON print_orders 
FOR INSERT 
WITH CHECK (
  -- السماح للمستخدمين المصرح لهم
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = ANY(ARRAY['admin'::app_role, 'manager'::app_role, 'employee'::app_role])
  )
  OR
  -- السماح للنظام عند وجود مرجع صالح للطلب
  (
    created_by IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM orders 
      WHERE id = print_orders.order_id
    )
  )
);

-- تحديث دالة التريغر لضمان عمل RLS
CREATE OR REPLACE FUNCTION create_print_order_for_completed_order()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- إنشاء طلب طباعة جديد عندما يتم تحديث حالة الطلب إلى "مكتمل"
  IF NEW.status = 'مكتمل' AND (OLD.status IS NULL OR OLD.status != 'مكتمل') THEN
    -- الحصول على معرف المستخدم الحالي
    current_user_id := COALESCE(NEW.updated_by, NEW.created_by, auth.uid());
    
    -- التحقق من عدم وجود طلب طباعة مسبق
    IF NOT EXISTS (SELECT 1 FROM print_orders WHERE order_id = NEW.id) THEN
      INSERT INTO print_orders (
        order_id,
        print_order_number,
        status,
        quantity,
        estimated_cost,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        'PRT-' || LPAD(nextval('print_order_seq')::text, 3, '0'),
        'pending',
        1,
        0,
        current_user_id,
        NOW(),
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;