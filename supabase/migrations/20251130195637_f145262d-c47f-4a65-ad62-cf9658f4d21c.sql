-- إنشاء جدول خطط التقسيط
CREATE TABLE IF NOT EXISTS public.installment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  total_amount NUMERIC NOT NULL,
  number_of_installments INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'overdue')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- إنشاء جدول دفعات التقسيط
CREATE TABLE IF NOT EXISTS public.installment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_plan_id UUID NOT NULL REFERENCES public.installment_plans(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  paid_amount NUMERIC DEFAULT 0,
  paid_date DATE,
  payment_id UUID REFERENCES public.payments(id),
  reminder_sent_2days BOOLEAN DEFAULT FALSE,
  reminder_sent_1day BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إضافة فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_installment_plans_order_id ON public.installment_plans(order_id);
CREATE INDEX IF NOT EXISTS idx_installment_plans_customer_id ON public.installment_plans(customer_id);
CREATE INDEX IF NOT EXISTS idx_installment_plans_status ON public.installment_plans(status);
CREATE INDEX IF NOT EXISTS idx_installment_payments_plan_id ON public.installment_payments(installment_plan_id);
CREATE INDEX IF NOT EXISTS idx_installment_payments_due_date ON public.installment_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_installment_payments_status ON public.installment_payments(status);

-- تفعيل RLS
ALTER TABLE public.installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_payments ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للموظفين والإداريين
CREATE POLICY "Authenticated users can view installment plans"
  ON public.installment_plans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage installment plans"
  ON public.installment_plans FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view installment payments"
  ON public.installment_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage installment payments"
  ON public.installment_payments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- دالة لتحديث حالة خطة التقسيط تلقائياً
CREATE OR REPLACE FUNCTION update_installment_plan_status()
RETURNS TRIGGER AS $$
DECLARE
  total_paid NUMERIC;
  plan_total NUMERIC;
  has_overdue BOOLEAN;
BEGIN
  -- حساب إجمالي المدفوع
  SELECT COALESCE(SUM(paid_amount), 0), 
         (SELECT total_amount FROM public.installment_plans WHERE id = NEW.installment_plan_id)
  INTO total_paid, plan_total
  FROM public.installment_payments
  WHERE installment_plan_id = NEW.installment_plan_id;

  -- التحقق من وجود دفعات متأخرة
  SELECT EXISTS(
    SELECT 1 FROM public.installment_payments
    WHERE installment_plan_id = NEW.installment_plan_id
    AND status = 'overdue'
  ) INTO has_overdue;

  -- تحديث حالة الخطة
  IF total_paid >= plan_total THEN
    UPDATE public.installment_plans
    SET status = 'completed', updated_at = NOW()
    WHERE id = NEW.installment_plan_id;
  ELSIF has_overdue THEN
    UPDATE public.installment_plans
    SET status = 'overdue', updated_at = NOW()
    WHERE id = NEW.installment_plan_id;
  ELSE
    UPDATE public.installment_plans
    SET status = 'active', updated_at = NOW()
    WHERE id = NEW.installment_plan_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- مشغل لتحديث حالة الخطة عند تغيير دفعة
CREATE TRIGGER trigger_update_installment_plan_status
AFTER INSERT OR UPDATE ON public.installment_payments
FOR EACH ROW
EXECUTE FUNCTION update_installment_plan_status();

-- دالة لتحديث حالة الدفعات المتأخرة
CREATE OR REPLACE FUNCTION mark_overdue_installments()
RETURNS void AS $$
BEGIN
  UPDATE public.installment_payments
  SET status = 'overdue', updated_at = NOW()
  WHERE status = 'pending'
  AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء view لعرض ملخص خطط التقسيط
CREATE OR REPLACE VIEW installment_plans_summary AS
SELECT 
  ip.id,
  ip.order_id,
  o.order_number,
  ip.customer_id,
  c.name as customer_name,
  c.phone as customer_phone,
  c.whatsapp as customer_whatsapp,
  ip.total_amount,
  ip.number_of_installments,
  ip.status as plan_status,
  ip.created_at,
  COALESCE(SUM(ipm.paid_amount), 0) as total_paid,
  ip.total_amount - COALESCE(SUM(ipm.paid_amount), 0) as remaining_amount,
  COUNT(CASE WHEN ipm.status = 'paid' THEN 1 END) as paid_installments,
  COUNT(CASE WHEN ipm.status = 'pending' THEN 1 END) as pending_installments,
  COUNT(CASE WHEN ipm.status = 'overdue' THEN 1 END) as overdue_installments
FROM public.installment_plans ip
JOIN public.orders o ON ip.order_id = o.id
JOIN public.customers c ON ip.customer_id = c.id
LEFT JOIN public.installment_payments ipm ON ip.id = ipm.installment_plan_id
GROUP BY ip.id, o.order_number, c.name, c.phone, c.whatsapp;

COMMENT ON TABLE public.installment_plans IS 'جدول خطط التقسيط للطلبات';
COMMENT ON TABLE public.installment_payments IS 'جدول دفعات التقسيط المجدولة';
COMMENT ON VIEW installment_plans_summary IS 'عرض ملخص خطط التقسيط مع الإحصائيات';