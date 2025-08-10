-- تحديث سياسات RLS للجداول الموجودة لدعم الوكالات

-- تحديث سياسات العملاء
DROP POLICY IF EXISTS "المدراء والموظفون يمكنهم رؤية جمي" ON public.customers;
DROP POLICY IF EXISTS "المدراء والموظفون يمكنهم إضافة عم" ON public.customers;
DROP POLICY IF EXISTS "المدراء والموظفون يمكنهم تحديث ال" ON public.customers;

CREATE POLICY "أعضاء الوكالة يمكنهم رؤية عملاء وكالتهم"
ON public.customers
FOR SELECT
USING (agency_id = get_current_user_agency());

CREATE POLICY "أعضاء الوكالة يمكنهم إضافة عملاء"
ON public.customers
FOR INSERT
WITH CHECK (agency_id = get_current_user_agency());

CREATE POLICY "أعضاء الوكالة يمكنهم تحديث عملاء وكالتهم"
ON public.customers
FOR UPDATE
USING (agency_id = get_current_user_agency());

-- تحديث سياسات الطلبات
DROP POLICY IF EXISTS "المدراء والموظفون يمكنهم رؤية جمي" ON public.orders;
DROP POLICY IF EXISTS "المدراء والموظفون يمكنهم إضافة طل" ON public.orders;
DROP POLICY IF EXISTS "المدراء والموظفون يمكنهم تحديث ال" ON public.orders;

CREATE POLICY "أعضاء الوكالة يمكنهم رؤية طلبات وكالتهم"
ON public.orders
FOR SELECT
USING (agency_id = get_current_user_agency());

CREATE POLICY "أعضاء الوكالة يمكنهم إضافة طلبات"
ON public.orders
FOR INSERT
WITH CHECK (agency_id = get_current_user_agency());

CREATE POLICY "أعضاء الوكالة يمكنهم تحديث طلبات وكالتهم"
ON public.orders
FOR UPDATE
USING (agency_id = get_current_user_agency());

-- تحديث سياسات الفواتير
DROP POLICY IF EXISTS "المدراء والموظفون يمكنهم رؤية جمي" ON public.invoices;
DROP POLICY IF EXISTS "المدراء والموظفون يمكنهم إضافة فو" ON public.invoices;
DROP POLICY IF EXISTS "المدراء والموظفون يمكنهم تحديث ال" ON public.invoices;

CREATE POLICY "أعضاء الوكالة يمكنهم رؤية فواتير وكالتهم"
ON public.invoices
FOR SELECT
USING (agency_id = get_current_user_agency());

CREATE POLICY "أعضاء الوكالة يمكنهم إضافة فواتير"
ON public.invoices
FOR INSERT
WITH CHECK (agency_id = get_current_user_agency());

CREATE POLICY "أعضاء الوكالة يمكنهم تحديث فواتير وكالتهم"
ON public.invoices
FOR UPDATE
USING (agency_id = get_current_user_agency());

-- تحديث سياسات المدفوعات
DROP POLICY IF EXISTS "المدراء والموظفون يمكنهم رؤية جمي" ON public.payments;
DROP POLICY IF EXISTS "المدراء والموظفون يمكنهم إضافة مد" ON public.payments;
DROP POLICY IF EXISTS "المدراء والموظفون يمكنهم تحديث ال" ON public.payments;

CREATE POLICY "أعضاء الوكالة يمكنهم رؤية مدفوعات وكالتهم"
ON public.payments
FOR SELECT
USING (agency_id = get_current_user_agency());

CREATE POLICY "أعضاء الوكالة يمكنهم إضافة مدفوعات"
ON public.payments
FOR INSERT
WITH CHECK (agency_id = get_current_user_agency());

CREATE POLICY "أعضاء الوكالة يمكنهم تحديث مدفوعات وكالتهم"
ON public.payments
FOR UPDATE
USING (agency_id = get_current_user_agency());

-- تحديث سياسات الخدمات
DROP POLICY IF EXISTS "المدراء والموظفون يمكنهم رؤية جمي" ON public.services;
DROP POLICY IF EXISTS "المدراء والموظفون يمكنهم إضافة خد" ON public.services;
DROP POLICY IF EXISTS "المدراء والموظفون يمكنهم تحديث ال" ON public.services;

CREATE POLICY "أعضاء الوكالة يمكنهم رؤية خدمات وكالتهم"
ON public.services
FOR SELECT
USING (agency_id = get_current_user_agency() OR is_active = true);

CREATE POLICY "أعضاء الوكالة يمكنهم إضافة خدمات"
ON public.services
FOR INSERT
WITH CHECK (agency_id = get_current_user_agency());

CREATE POLICY "أعضاء الوكالة يمكنهم تحديث خدمات وكالتهم"
ON public.services
FOR UPDATE
USING (agency_id = get_current_user_agency());

-- تحديث سياسات الحسابات
DROP POLICY IF EXISTS "المدراء والمحاسبون يمكنهم إدارة ا" ON public.accounts;

CREATE POLICY "أعضاء الوكالة يمكنهم إدارة حسابات وكالتهم"
ON public.accounts
FOR ALL
USING (
  agency_id = get_current_user_agency() AND
  (has_role(auth.uid(), 'admin'::app_role) OR 
   has_role(auth.uid(), 'manager'::app_role) OR 
   has_role(auth.uid(), 'accountant'::app_role))
);

-- تحديث سياسات القيود المحاسبية
CREATE POLICY "أعضاء الوكالة يمكنهم إدارة قيود وكالتهم"
ON public.account_entries
FOR ALL
USING (
  agency_id = get_current_user_agency() AND
  (has_role(auth.uid(), 'admin'::app_role) OR 
   has_role(auth.uid(), 'manager'::app_role) OR 
   has_role(auth.uid(), 'accountant'::app_role))
);

-- تحديث سياسات المصروفات
DROP POLICY IF EXISTS "المدراء والمحاسبون والموظفون يمكن" ON public.expenses;

CREATE POLICY "أعضاء الوكالة يمكنهم إدارة مصروفات وكالتهم"
ON public.expenses
FOR ALL
USING (
  agency_id = get_current_user_agency() AND
  (has_role(auth.uid(), 'admin'::app_role) OR 
   has_role(auth.uid(), 'manager'::app_role) OR 
   has_role(auth.uid(), 'accountant'::app_role) OR
   has_role(auth.uid(), 'employee'::app_role))
);

-- تحديث سياسات التقييمات
DROP POLICY IF EXISTS "المدراء والموظفون يمكنهم رؤية جمي" ON public.evaluations;

CREATE POLICY "أعضاء الوكالة يمكنهم رؤية تقييمات وكالتهم"
ON public.evaluations
FOR SELECT
USING (
  agency_id = get_current_user_agency() OR
  is_public = true
);

-- تحديث سياسات رسائل الواتساب
DROP POLICY IF EXISTS "المدراء والموظفون يمكنهم رؤية جمي" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "المدراء والموظفون يمكنهم إضافة رس" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "المدراء والموظفون يمكنهم تحديث ال" ON public.whatsapp_messages;

CREATE POLICY "أعضاء الوكالة يمكنهم رؤية رسائل وكالتهم"
ON public.whatsapp_messages
FOR SELECT
USING (agency_id = get_current_user_agency());

CREATE POLICY "أعضاء الوكالة يمكنهم إضافة رسائل"
ON public.whatsapp_messages
FOR INSERT
WITH CHECK (agency_id = get_current_user_agency() OR agency_id IS NULL);

CREATE POLICY "أعضاء الوكالة يمكنهم تحديث رسائل وكالتهم"
ON public.whatsapp_messages
FOR UPDATE
USING (agency_id = get_current_user_agency());

-- إنشاء trigger لتعيين agency_id تلقائياً
CREATE OR REPLACE FUNCTION public.set_agency_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- تعيين agency_id للمستخدم الحالي إذا لم يكن محدداً
  IF NEW.agency_id IS NULL THEN
    NEW.agency_id := get_current_user_agency();
  END IF;
  
  RETURN NEW;
END;
$$;

-- إضافة triggers للجداول الرئيسية
CREATE TRIGGER set_agency_id_customers
  BEFORE INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_agency_id();

CREATE TRIGGER set_agency_id_orders
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_agency_id();

CREATE TRIGGER set_agency_id_invoices
  BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_agency_id();

CREATE TRIGGER set_agency_id_payments
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_agency_id();

CREATE TRIGGER set_agency_id_services
  BEFORE INSERT ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_agency_id();

CREATE TRIGGER set_agency_id_accounts
  BEFORE INSERT ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_agency_id();

CREATE TRIGGER set_agency_id_account_entries
  BEFORE INSERT ON public.account_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_agency_id();

CREATE TRIGGER set_agency_id_expenses
  BEFORE INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_agency_id();

CREATE TRIGGER set_agency_id_whatsapp_messages
  BEFORE INSERT ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_agency_id();