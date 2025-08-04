-- إزالة حقول paid_amount من الجداول وإنشاء views محسوبة
-- أولاً: إنشاء view لحساب المبالغ المدفوعة للفواتير
CREATE OR REPLACE VIEW invoice_payment_summary AS
SELECT 
    i.id,
    i.invoice_number,
    i.customer_id,
    i.order_id,
    i.amount,
    i.tax_amount,
    i.total_amount,
    i.issue_date,
    i.due_date,
    i.payment_date,
    i.payment_type,
    i.payment_method,
    i.status,
    i.notes,
    i.is_deferred,
    i.reminder_sent_at,
    i.whatsapp_sent_at,
    i.last_printed_at,
    i.print_count,
    i.created_by,
    i.created_at,
    i.updated_at,
    COALESCE(SUM(p.amount), 0) as calculated_paid_amount,
    i.total_amount - COALESCE(SUM(p.amount), 0) as remaining_amount
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.id
GROUP BY i.id, i.invoice_number, i.customer_id, i.order_id, i.amount, i.tax_amount, 
         i.total_amount, i.issue_date, i.due_date, i.payment_date, i.payment_type, 
         i.payment_method, i.status, i.notes, i.is_deferred, i.reminder_sent_at, 
         i.whatsapp_sent_at, i.last_printed_at, i.print_count, i.created_by, 
         i.created_at, i.updated_at;

-- إنشاء view لحساب المبالغ المدفوعة للطلبات
CREATE OR REPLACE VIEW order_payment_summary AS
SELECT 
    o.id,
    o.order_number,
    o.customer_id,
    o.service_id,
    o.service_name,
    o.description,
    o.amount,
    o.status,
    o.priority,
    o.progress,
    o.start_date,
    o.due_date,
    o.completion_date,
    o.payment_type,
    o.payment_notes,
    o.notes,
    o.attachment_urls,
    o.assigned_to,
    o.created_by,
    o.created_at,
    o.updated_at,
    COALESCE(SUM(p.amount), 0) as calculated_paid_amount,
    o.amount - COALESCE(SUM(p.amount), 0) as remaining_amount
FROM orders o
LEFT JOIN invoices i ON i.order_id = o.id
LEFT JOIN payments p ON p.invoice_id = i.id OR p.order_id = o.id
GROUP BY o.id, o.order_number, o.customer_id, o.service_id, o.service_name, 
         o.description, o.amount, o.status, o.priority, o.progress, o.start_date, 
         o.due_date, o.completion_date, o.payment_type, o.payment_notes, o.notes, 
         o.attachment_urls, o.assigned_to, o.created_by, o.created_at, o.updated_at;

-- تحديث دالة حساب رصيد العملاء المدينين لتعتمد على المدفوعات الفعلية
CREATE OR REPLACE FUNCTION public.calculate_accounts_receivable_balance()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    total_unpaid NUMERIC := 0;
BEGIN
    -- حساب إجمالي الفواتير غير المدفوعة من المدفوعات الفعلية
    SELECT COALESCE(SUM(i.total_amount - COALESCE(p.total_payments, 0)), 0)
    INTO total_unpaid
    FROM invoices i
    LEFT JOIN (
        SELECT invoice_id, SUM(amount) as total_payments
        FROM payments
        GROUP BY invoice_id
    ) p ON p.invoice_id = i.id
    WHERE (i.total_amount - COALESCE(p.total_payments, 0)) > 0;
    
    RETURN total_unpaid;
END;
$function$;