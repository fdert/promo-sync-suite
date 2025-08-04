-- إصلاح الفرق بين المبالغ المدفوعة في الفواتير والمدفوعات المسجلة
-- إنشاء مدفوعات للفروقات المفقودة

-- فاتورة INV-018: المدفوع 60 والمسجل 30، الفرق 30
INSERT INTO payments (
    invoice_id,
    amount,
    payment_date,
    payment_type,
    notes,
    created_by
)
SELECT 
    i.id,
    30, -- الفرق المفقود
    CURRENT_DATE,
    'تسوية محاسبية',
    'تسوية للفرق المفقود - فاتورة INV-018',
    i.created_by
FROM invoices i
WHERE i.invoice_number = 'INV-018';

-- فاتورة INV-017: المدفوع 20 والمسجل 10، الفرق 10
INSERT INTO payments (
    invoice_id,
    amount,
    payment_date,
    payment_type,
    notes,
    created_by
)
SELECT 
    i.id,
    10, -- الفرق المفقود
    CURRENT_DATE,
    'تسوية محاسبية',
    'تسوية للفرق المفقود - فاتورة INV-017',
    i.created_by
FROM invoices i
WHERE i.invoice_number = 'INV-017';

-- فاتورة INV-014: المدفوع 99.98 والمسجل 49.99، الفرق 49.99
INSERT INTO payments (
    invoice_id,
    amount,
    payment_date,
    payment_type,
    notes,
    created_by
)
SELECT 
    i.id,
    49.99, -- الفرق المفقود
    CURRENT_DATE,
    'تسوية محاسبية',
    'تسوية للفرق المفقود - فاتورة INV-014',
    i.created_by
FROM invoices i
WHERE i.invoice_number = 'INV-014';

-- فاتورة INV-013: المدفوع 40 والمسجل 20، الفرق 20
INSERT INTO payments (
    invoice_id,
    amount,
    payment_date,
    payment_type,
    notes,
    created_by
)
SELECT 
    i.id,
    20, -- الفرق المفقود
    CURRENT_DATE,
    'تسوية محاسبية',
    'تسوية للفرق المفقود - فاتورة INV-013',
    i.created_by
FROM invoices i
WHERE i.invoice_number = 'INV-013';

-- تحديث رصيد العملاء المدينين
SELECT sync_accounts_receivable_balance();