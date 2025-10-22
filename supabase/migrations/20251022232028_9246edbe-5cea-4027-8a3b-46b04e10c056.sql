-- إصلاح دالة تسجيل إدخال المصروف
DROP TRIGGER IF EXISTS trg_log_expense_insert ON public.expenses;
DROP FUNCTION IF EXISTS public.trg_fn_log_expense_insert();

CREATE OR REPLACE FUNCTION public.trg_fn_log_expense_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_activity(
    'create',
    'expense',
    NEW.id,
    jsonb_build_object('amount', NEW.amount, 'expense_type', NEW.expense_type)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_expense_insert
AFTER INSERT ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_log_expense_insert();

-- إصلاح دالة تسجيل إدخال الدفعة
DROP TRIGGER IF EXISTS trg_log_payment_insert ON public.payments;
DROP FUNCTION IF EXISTS public.trg_fn_log_payment_insert();

CREATE OR REPLACE FUNCTION public.trg_fn_log_payment_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_activity(
    'create',
    'payment',
    NEW.id,
    jsonb_build_object('amount', NEW.amount, 'order_id', NEW.order_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_payment_insert
AFTER INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_log_payment_insert();

-- إصلاح دالة تسجيل إدخال الطلب
DROP TRIGGER IF EXISTS trg_log_order_insert ON public.orders;
DROP FUNCTION IF EXISTS public.trg_fn_log_order_insert();

CREATE OR REPLACE FUNCTION public.trg_fn_log_order_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_activity(
    'create',
    'order',
    NEW.id,
    jsonb_build_object('order_number', NEW.order_number, 'status', NEW.status)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_order_insert
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_log_order_insert();

-- إصلاح دالة تسجيل تحديث الطلب
DROP TRIGGER IF EXISTS trg_log_order_update ON public.orders;
DROP FUNCTION IF EXISTS public.trg_fn_log_order_update();

CREATE OR REPLACE FUNCTION public.trg_fn_log_order_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_activity(
    'update',
    'order',
    NEW.id,
    jsonb_build_object('order_number', NEW.order_number, 'status', NEW.status)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_order_update
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_log_order_update();