-- Ensure profiles are auto-created on signup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Create central activity logger
CREATE OR REPLACE FUNCTION public.log_activity(
  _action text,
  _resource_type text,
  _resource_id uuid,
  _details jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN;
  END IF;

  -- ensure profile exists to satisfy FK
  INSERT INTO public.profiles (id)
  SELECT uid
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = uid);

  INSERT INTO public.user_activity_logs (user_id, action, details, ip_address, user_agent)
  VALUES (
    uid,
    _action,
    COALESCE(_details, '{}'::jsonb) || jsonb_build_object('resource_type', _resource_type, 'resource_id', _resource_id),
    NULL,
    NULL
  );
END;
$$;

-- Trigger function for orders insert
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

-- Trigger function for orders update
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

-- Trigger function for payments insert
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

-- Trigger function for expenses insert
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

-- Create triggers (drop if exist first)
DROP TRIGGER IF EXISTS trg_log_order_insert ON public.orders;
CREATE TRIGGER trg_log_order_insert
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_log_order_insert();

DROP TRIGGER IF EXISTS trg_log_order_update ON public.orders;
CREATE TRIGGER trg_log_order_update
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_log_order_update();

DROP TRIGGER IF EXISTS trg_log_payment_insert ON public.payments;
CREATE TRIGGER trg_log_payment_insert
AFTER INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_log_payment_insert();

DROP TRIGGER IF EXISTS trg_log_expense_insert ON public.expenses;
CREATE TRIGGER trg_log_expense_insert
AFTER INSERT ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_log_expense_insert();