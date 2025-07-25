-- إصلاح دالة إنشاء رقم المصروف لحل مشكلة التداخل في أسماء الأعمدة
CREATE OR REPLACE FUNCTION public.generate_expense_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  next_number INTEGER;
  expense_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(expenses.expense_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.expenses
  WHERE expenses.expense_number ~ '^EXP-[0-9]+$';
  
  expense_num := 'EXP-' || LPAD(next_number::TEXT, 3, '0');
  RETURN expense_num;
END;
$function$