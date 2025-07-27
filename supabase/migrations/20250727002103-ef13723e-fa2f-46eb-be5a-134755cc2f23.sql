-- حذف جميع القيود المحاسبية وإعادة إنشائها من جديد
DELETE FROM public.account_entries;

-- إعادة إنشاء القيود للفواتير
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
WITH invoice_data AS (
  SELECT 
    i.id as invoice_id,
    i.total_amount,
    i.invoice_number,
    c.name as customer_name,
    i.issue_date
  FROM invoices i
  JOIN customers c ON i.customer_id = c.id
),
account_ids AS (
  SELECT 
    (SELECT id FROM accounts WHERE account_name = 'العملاء المدينون') as receivables_account,
    (SELECT id FROM accounts WHERE account_name = 'إيرادات المبيعات') as revenue_account
)
-- قيود مدينة للعملاء المدينون (إنشاء الدين)
SELECT 
  ai.receivables_account as account_id,
  'فاتورة' as reference_type,
  id.invoice_id as reference_id,
  'فاتورة للعميل: ' || id.customer_name as description,
  id.total_amount as debit_amount,
  0 as credit_amount,
  id.issue_date as entry_date,
  '90b43c58-7b69-4cae-9e8d-854a5a4c8ffb'::uuid as created_by
FROM invoice_data id
CROSS JOIN account_ids ai

UNION ALL

-- قيود دائنة للإيرادات (تسجيل الإيراد)
SELECT 
  ai.revenue_account as account_id,
  'فاتورة' as reference_type,
  id.invoice_id as reference_id,
  'إيراد من فاتورة للعميل: ' || id.customer_name as description,
  0 as debit_amount,
  id.total_amount as credit_amount,
  id.issue_date as entry_date,
  '90b43c58-7b69-4cae-9e8d-854a5a4c8ffb'::uuid as created_by
FROM invoice_data id
CROSS JOIN account_ids ai;