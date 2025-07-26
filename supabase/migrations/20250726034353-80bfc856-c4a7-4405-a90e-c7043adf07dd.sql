-- إنشاء trigger لتحديث رصيد الحسابات
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- في حالة الإدراج أو التحديث
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.accounts 
    SET balance = (
      SELECT COALESCE(SUM(debit_amount - credit_amount), 0)
      FROM public.account_entries 
      WHERE account_id = NEW.account_id
    ),
    updated_at = now()
    WHERE id = NEW.account_id;
    
    RETURN NEW;
  END IF;
  
  -- في حالة الحذف
  IF TG_OP = 'DELETE' THEN
    UPDATE public.accounts 
    SET balance = (
      SELECT COALESCE(SUM(debit_amount - credit_amount), 0)
      FROM public.account_entries 
      WHERE account_id = OLD.account_id
    ),
    updated_at = now()
    WHERE id = OLD.account_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger لتحديث رصيد الحسابات
CREATE TRIGGER account_balance_update_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.account_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_balance();

-- إنشاء trigger لتحديث updated_at للحسابات
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- إنشاء دالة لإضافة قيد محاسبي للفاتورة
CREATE OR REPLACE FUNCTION public.create_invoice_accounting_entry(
  invoice_id uuid,
  customer_name text,
  total_amount numeric
)
RETURNS void AS $$
DECLARE
  revenue_account_id uuid;
  accounts_receivable_id uuid;
BEGIN
  -- البحث عن حساب الإيرادات أو إنشاؤه
  SELECT id INTO revenue_account_id 
  FROM public.accounts 
  WHERE account_name = 'إيرادات المبيعات' AND account_type = 'إيرادات';
  
  IF revenue_account_id IS NULL THEN
    INSERT INTO public.accounts (account_name, account_type, description)
    VALUES ('إيرادات المبيعات', 'إيرادات', 'إيرادات من بيع الخدمات والمنتجات')
    RETURNING id INTO revenue_account_id;
  END IF;
  
  -- البحث عن حساب المدينون أو إنشاؤه
  SELECT id INTO accounts_receivable_id 
  FROM public.accounts 
  WHERE account_name = 'العملاء المدينون' AND account_type = 'أصول';
  
  IF accounts_receivable_id IS NULL THEN
    INSERT INTO public.accounts (account_name, account_type, description)
    VALUES ('العملاء المدينون', 'أصول', 'المبالغ المستحقة من العملاء')
    RETURNING id INTO accounts_receivable_id;
  END IF;
  
  -- إضافة قيد مدين للعملاء المدينون
  INSERT INTO public.account_entries (
    account_id, 
    reference_type, 
    reference_id, 
    description, 
    debit_amount,
    created_by
  ) VALUES (
    accounts_receivable_id,
    'فاتورة',
    invoice_id,
    'فاتورة للعميل: ' || customer_name,
    total_amount,
    auth.uid()
  );
  
  -- إضافة قيد دائن للإيرادات
  INSERT INTO public.account_entries (
    account_id, 
    reference_type, 
    reference_id, 
    description, 
    credit_amount,
    created_by
  ) VALUES (
    revenue_account_id,
    'فاتورة',
    invoice_id,
    'إيراد من فاتورة للعميل: ' || customer_name,
    total_amount,
    auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger لإضافة القيود المحاسبية تلقائياً عند إنشاء فاتورة
CREATE OR REPLACE FUNCTION public.handle_invoice_accounting()
RETURNS TRIGGER AS $$
DECLARE
  customer_name text;
BEGIN
  -- في حالة إنشاء فاتورة جديدة
  IF TG_OP = 'INSERT' THEN
    -- جلب اسم العميل
    SELECT name INTO customer_name
    FROM public.customers
    WHERE id = NEW.customer_id;
    
    -- إضافة القيود المحاسبية
    PERFORM public.create_invoice_accounting_entry(
      NEW.id,
      COALESCE(customer_name, 'عميل غير محدد'),
      NEW.total_amount
    );
    
    RETURN NEW;
  END IF;
  
  -- في حالة حذف الفاتورة
  IF TG_OP = 'DELETE' THEN
    -- حذف القيود المحاسبية المرتبطة
    DELETE FROM public.account_entries
    WHERE reference_type = 'فاتورة' AND reference_id = OLD.id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger للفواتير
CREATE TRIGGER invoice_accounting_trigger
  AFTER INSERT OR DELETE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invoice_accounting();