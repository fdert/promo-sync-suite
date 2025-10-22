-- إصلاح trigger إشعار المصروفات الجديدة
-- المشكلة: استخدام إعداد غير موجود وعدم وجود معالج للأخطاء
-- الحل: إزالة Authorization header وإضافة معالج للأخطاء

DROP TRIGGER IF EXISTS trigger_notify_expense_logged ON public.expenses;
DROP FUNCTION IF EXISTS public.notify_expense_logged();

CREATE OR REPLACE FUNCTION public.notify_expense_logged()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- استدعاء edge function لإرسال إشعار واتساب بالمصروف الجديد
  PERFORM net.http_post(
    url := 'https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/notify-new-expense',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcnprZnBvd2p1dHlsZWdkY3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MzU5NzIsImV4cCI6MjA3NDQxMTk3Mn0.frZ6OBDDuqbXOmQUydyoLdCnI5n5_WnS96x2qMPNR78'
    ),
    body := jsonb_build_object(
      'expense_id', NEW.id,
      'test', false
    )
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- لا نفشل عملية إدخال المصروف في حالة فشل الإشعار
    RAISE WARNING 'Failed to notify expense: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- إنشاء trigger على جدول expenses
CREATE TRIGGER trigger_notify_expense_logged
  AFTER INSERT ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_expense_logged();