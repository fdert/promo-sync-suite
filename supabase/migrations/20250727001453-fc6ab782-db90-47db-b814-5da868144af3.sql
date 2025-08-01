-- إنشاء حساب البنك إذا لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'البنك') THEN
    INSERT INTO public.accounts (account_name, account_type, description)
    VALUES ('البنك', 'أصول', 'الحسابات البنكية');
  END IF;
END $$;

-- إنشاء القيود المحاسبية للمدفوعات المفقودة
WITH payment_data AS (
  SELECT 
    p.id as payment_id,
    p.amount,
    p.payment_type,
    p.invoice_id,
    i.invoice_number,
    c.name as customer_name
  FROM payments p
  JOIN invoices i ON p.invoice_id = i.id
  JOIN customers c ON i.customer_id = c.id
  WHERE p.invoice_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM account_entries ae 
      WHERE ae.reference_type = 'دفعة' 
      AND ae.reference_id = p.id
    )
),
account_ids AS (
  SELECT 
    (SELECT id FROM accounts WHERE account_name = 'العملاء المدينون') as receivables_account,
    (SELECT id FROM accounts WHERE account_name = 'النقدية') as cash_account,
    (SELECT id FROM accounts WHERE account_name = 'البنك') as bank_account
)
INSERT INTO public.account_entries (
  account_id, 
  reference_type, 
  reference_id, 
  description, 
  debit_amount,
  credit_amount,
  entry_date,
  created_by
)
-- قيود مدينة للنقدية/البنك (استلام المال)
SELECT 
  CASE 
    WHEN pd.payment_type IN ('نقدي', 'كاش') THEN ai.cash_account
    ELSE ai.bank_account
  END as account_id,
  'دفعة' as reference_type,
  pd.payment_id as reference_id,
  'استلام دفعة من العميل: ' || pd.customer_name || ' للفاتورة: ' || pd.invoice_number as description,
  pd.amount as debit_amount,
  0 as credit_amount,
  CURRENT_DATE as entry_date,
  '90b43c58-7b69-4cae-9e8d-854a5a4c8ffb'::uuid as created_by
FROM payment_data pd
CROSS JOIN account_ids ai

UNION ALL

-- قيود دائنة للعملاء المدينون (تقليل الدين)
SELECT 
  ai.receivables_account as account_id,
  'دفعة' as reference_type,
  pd.payment_id as reference_id,
  'استلام دفعة من العميل: ' || pd.customer_name || ' للفاتورة: ' || pd.invoice_number as description,
  0 as debit_amount,
  pd.amount as credit_amount,
  CURRENT_DATE as entry_date,
  '90b43c58-7b69-4cae-9e8d-854a5a4c8ffb'::uuid as created_by
FROM payment_data pd
CROSS JOIN account_ids ai;