-- إضافة دالة لمعالجة المدفوعات غير المرتبطة بفواتير
CREATE OR REPLACE FUNCTION update_accounts_receivable_on_payment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- تحديث paid_amount في الفاتورة إذا كانت مرتبطة بفاتورة
  IF TG_OP = 'INSERT' AND NEW.invoice_id IS NOT NULL THEN
    UPDATE invoices 
    SET paid_amount = COALESCE(paid_amount, 0) + NEW.amount
    WHERE id = NEW.invoice_id;
  ELSIF TG_OP = 'DELETE' AND OLD.invoice_id IS NOT NULL THEN
    UPDATE invoices 
    SET paid_amount = GREATEST(COALESCE(paid_amount, 0) - OLD.amount, 0)
    WHERE id = OLD.invoice_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.invoice_id IS NOT NULL THEN
    -- إزالة المبلغ القديم وإضافة الجديد
    UPDATE invoices 
    SET paid_amount = GREATEST(COALESCE(paid_amount, 0) - COALESCE(OLD.amount, 0) + NEW.amount, 0)
    WHERE id = NEW.invoice_id;
  END IF;
  
  -- في جميع الحالات، تحديث رصيد العملاء المدينون
  -- للمدفوعات غير المرتبطة بفواتير، نقوم بتقليل الرصيد مباشرة
  IF TG_OP = 'INSERT' THEN
    IF NEW.invoice_id IS NULL THEN
      -- إذا لم تكن مرتبطة بفاتورة، اطرح من رصيد العملاء المدينون مباشرة
      UPDATE accounts 
      SET balance = GREATEST(balance - NEW.amount, 0),
          updated_at = now()
      WHERE account_name = 'العملاء المدينون';
    ELSE
      -- إذا كانت مرتبطة بفاتورة، استخدم الحساب العادي
      PERFORM sync_accounts_receivable_balance();
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.invoice_id IS NULL THEN
      -- إذا لم تكن مرتبطة بفاتورة، أضف للرصيد
      UPDATE accounts 
      SET balance = balance + OLD.amount,
          updated_at = now()
      WHERE account_name = 'العملاء المدينون';
    ELSE
      -- إذا كانت مرتبطة بفاتورة، استخدم الحساب العادي
      PERFORM sync_accounts_receivable_balance();
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- في حالة التحديث، احسب الفرق واطبقه
    IF NEW.invoice_id IS NULL AND OLD.invoice_id IS NULL THEN
      UPDATE accounts 
      SET balance = GREATEST(balance - (NEW.amount - OLD.amount), 0),
          updated_at = now()
      WHERE account_name = 'العملاء المدينون';
    ELSE
      PERFORM sync_accounts_receivable_balance();
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;