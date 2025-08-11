import React from 'react';

interface InvoiceItem {
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
}

interface InvoicePrintProps {
  invoice: {
    invoice_number: string;
    order_id?: string;
    issue_date: string;
    due_date: string;
    amount: number;
    tax_amount: number;
    total_amount: number;
    status: string;
    actual_status?: string;
    payment_status?: string;
    actual_payment_type?: string;
    total_paid?: number;
    remaining_amount?: number;
    notes?: string;
    payment_type: string;
    customers?: {
      name: string;
      phone?: string;
      address?: string;
    };
  };
  items: InvoiceItem[];
  companyInfo?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logo?: string;
    stamp?: string;
    tagline?: string;
  };
}

const InvoicePrint: React.FC<InvoicePrintProps> = ({ 
  invoice, 
  items, 
  companyInfo = {
    name: "شركتك",
    address: "عنوان الشركة",
    phone: "رقم الهاتف",
    email: "البريد الإلكتروني"
  }
}) => {
  return (
    <>
      <style type="text/css" media="print">
        {`
          @page {
            size: A4;
            margin: 15mm;
            @bottom-center {
              content: "";
            }
          }
          
          .print-invoice {
            display: block !important;
            font-family: 'Arial', sans-serif;
            font-size: 11px;
            line-height: 1.3;
            color: #000;
            background: white;
            max-width: 100%;
            height: auto;
            margin: 0;
            padding: 0;
          }
          
          .print-invoice * {
            box-sizing: border-box;
          }
          
          .print-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 4mm;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 3mm;
            page-break-inside: avoid;
          }
          
          .print-company-info {
            flex: 1;
            text-align: right;
          }
          
          .print-company-name {
            font-size: 16px;
            font-weight: bold;
            margin: 0 0 2mm 0;
            color: #2563eb;
          }
          
          .print-company-details {
            font-size: 9px;
            color: #6b7280;
            line-height: 1.4;
          }
          
          .print-logo {
            flex-shrink: 0;
            margin: 0 6mm;
            text-align: center;
          }
          
          .print-logo img {
            width: 12mm;
            height: 12mm;
            object-fit: contain;
          }
          
          .print-invoice-info {
            flex: 1;
            text-align: left;
          }
          
          .print-invoice-title {
            font-size: 16px;
            font-weight: bold;
            margin: 0 0 2mm 0;
            color: #2563eb;
          }
          
          .print-invoice-details {
            font-size: 9px;
            color: #6b7280;
            line-height: 1.4;
          }
          
          .print-customer-section {
            margin-bottom: 3mm;
          }
          
          .print-section-header {
            background-color: #f3f4f6;
            padding: 1.5mm;
            border-right: 3px solid #2563eb;
            margin-bottom: 1.5mm;
            font-size: 10px;
            font-weight: bold;
            color: #374151;
          }
          
          .print-customer-details {
            padding-right: 2mm;
            font-size: 9px;
          }
          
          .print-customer-name {
            font-weight: bold;
            font-size: 10px;
            margin-bottom: 1mm;
          }
          
          .print-items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
            margin-bottom: 3mm;
          }
          
          .print-items-table th,
          .print-items-table td {
            border: 1px solid #d1d5db;
            padding: 1.5mm;
            text-align: center;
          }
          
          .print-items-table th {
            background-color: #2563eb;
            color: white;
            font-weight: bold;
            font-size: 9px;
          }
          
          .print-items-table td:last-child {
            text-align: right;
          }
          
          .print-totals {
            margin-bottom: 3mm;
            text-align: left;
          }
          
          .print-totals-box {
            display: inline-block;
            width: 35mm;
            font-size: 9px;
          }
          
          .print-total-row {
            display: flex;
            justify-content: space-between;
            padding: 0.5mm 0;
            border-bottom: 0.5px solid #d1d5db;
          }
          
          .print-final-total {
            display: flex;
            justify-content: space-between;
            padding: 1mm 0;
            font-weight: bold;
            font-size: 10px;
            border-top: 1px solid #2563eb;
            margin-top: 1mm;
          }
          
          .print-payment-info {
            background-color: #f0f9ff;
            border: 1px solid #bfdbfe;
            border-radius: 2mm;
            padding: 2.5mm;
            font-size: 8px;
            margin-bottom: 3mm;
          }
          
          .print-payment-header {
            color: #2563eb;
            font-weight: bold;
            margin-bottom: 1.5mm;
            font-size: 9px;
          }
          
          .print-payment-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1mm;
          }
          
          .print-payment-amounts {
            display: flex;
            justify-content: space-between;
            margin-top: 1.5mm;
            padding-top: 1.5mm;
            border-top: 1px solid #93c5fd;
          }
          
          .print-payment-amount {
            text-align: center;
            flex: 1;
          }
          
          .print-payment-label {
            color: #6b7280;
            font-size: 7px;
            margin-bottom: 0.5mm;
          }
          
          .print-payment-value {
            font-weight: bold;
            font-size: 8px;
          }
          
          .print-notes {
            font-size: 8px;
            margin-bottom: 2mm;
            background-color: #f9fafb;
            padding: 1.5mm;
            border-radius: 1mm;
            color: #6b7280;
          }
          
          .print-footer {
            text-align: center;
            font-size: 8px;
            color: #6b7280;
            border-top: 0.5px solid #d1d5db;
            padding-top: 2mm;
            margin-top: 3mm;
          }
          
          .print-footer-title {
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 1mm;
          }
          
          .print-footer-tagline {
            font-size: 8px;
            color: #2563eb;
            font-style: italic;
            margin-bottom: 1mm;
          }
          
          .print-stamp {
            text-align: center;
            margin: 3mm 0;
          }
          
          .print-stamp img {
            width: 15mm;
            height: 12mm;
            object-fit: contain;
          }
          
          @media screen {
            .print-invoice {
              display: none;
            }
          }
        `}
      </style>
      
      <div className="print-invoice">
        {/* Header */}
        <div className="print-header">
          <div className="print-company-info">
            <h1 className="print-company-name">{companyInfo.name}</h1>
            <div className="print-company-details">
              <div>{companyInfo.address}</div>
              <div>هاتف: {companyInfo.phone}</div>
              <div>البريد: {companyInfo.email}</div>
            </div>
          </div>
          
          <div className="print-logo">
            {companyInfo.logo && (
              <img src={companyInfo.logo} alt="شعار الشركة" />
            )}
          </div>
          
          <div className="print-invoice-info">
            <h2 className="print-invoice-title">فاتورة</h2>
            <div className="print-invoice-details">
              <div><strong>رقم الفاتورة:</strong> {invoice.invoice_number}</div>
              <div><strong>تاريخ الإصدار:</strong> {new Date(invoice.issue_date).toLocaleDateString('ar-SA')}</div>
              <div><strong>تاريخ الاستحقاق:</strong> {new Date(invoice.due_date).toLocaleDateString('ar-SA')}</div>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="print-customer-section">
          <div className="print-section-header">بيانات العميل</div>
          <div className="print-customer-details">
            <div className="print-customer-name">{invoice.customers?.name || 'غير محدد'}</div>
            {invoice.customers?.phone && <div>الهاتف: {invoice.customers.phone}</div>}
            {invoice.customers?.address && <div>العنوان: {invoice.customers.address}</div>}
          </div>
        </div>

        {/* Items Section */}
        <div className="print-customer-section">
          <div className="print-section-header">تفاصيل الفاتورة</div>
          
          <table className="print-items-table">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>الإجمالي (ر.س)</th>
                <th style={{ width: '18%' }}>السعر (ر.س)</th>
                <th style={{ width: '12%' }}>الكمية</th>
                <th style={{ width: '42%' }}>اسم البند / الخدمة</th>
                <th style={{ width: '8%' }}>#</th>
              </tr>
            </thead>
            <tbody>
              {items && items.length > 0 ? (
                items.map((item, index) => (
                  <tr key={index}>
                    <td style={{ fontWeight: 'bold', color: '#2563eb' }}>
                      {item.total_amount?.toLocaleString('ar-SA')}
                    </td>
                    <td style={{ fontWeight: 'bold' }}>
                      {item.unit_price?.toLocaleString('ar-SA')}
                    </td>
                    <td>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.5mm' }}>{item.item_name}</div>
                      {item.description && (
                        <div style={{ fontSize: '8px', color: '#6b7280' }}>{item.description}</div>
                      )}
                    </td>
                    <td style={{ fontWeight: 'bold' }}>{index + 1}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={{ fontWeight: 'bold', color: '#2563eb' }}>
                    {invoice.amount?.toLocaleString('ar-SA')}
                  </td>
                  <td style={{ fontWeight: 'bold' }}>
                    {invoice.amount?.toLocaleString('ar-SA')}
                  </td>
                  <td>1</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5mm' }}>خدمات عامة</div>
                    <div style={{ fontSize: '8px', color: '#6b7280' }}>{invoice.notes || 'خدمات متنوعة'}</div>
                  </td>
                  <td style={{ fontWeight: 'bold' }}>1</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="print-totals">
          <div className="print-totals-box">
            <div className="print-total-row">
              <span>المجموع الفرعي:</span>
              <span>{invoice.amount?.toLocaleString('ar-SA')} ر.س</span>
            </div>
            <div className="print-total-row">
              <span>ضريبة القيمة المضافة (15%):</span>
              <span>{invoice.tax_amount?.toLocaleString('ar-SA')} ر.س</span>
            </div>
            <div className="print-final-total">
              <span>إجمالي المبلغ المستحق:</span>
              <span style={{ color: '#2563eb' }}>{invoice.total_amount?.toLocaleString('ar-SA')} ر.س</span>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="print-payment-info">
          <div className="print-payment-header">معلومات الدفع والحالة:</div>
          
          <div className="print-payment-row">
            <span>حالة الفاتورة:</span>
            <strong>{invoice.actual_status || invoice.payment_status || invoice.status}</strong>
          </div>
          
          <div className="print-payment-row">
            <span>نوع الدفع:</span>
            <strong>{invoice.actual_payment_type || invoice.payment_type || 'دفع آجل'}</strong>
          </div>

          <div className="print-payment-amounts">
            <div className="print-payment-amount">
              <div className="print-payment-label">إجمالي الفاتورة</div>
              <div className="print-payment-value" style={{ color: '#2563eb' }}>
                {invoice.total_amount?.toLocaleString('ar-SA')} ر.س
              </div>
            </div>
            <div className="print-payment-amount">
              <div className="print-payment-label">المبلغ المدفوع</div>
              <div className="print-payment-value" style={{ color: '#059669' }}>
                {(invoice.total_paid || 0).toLocaleString('ar-SA')} ر.س
              </div>
            </div>
            <div className="print-payment-amount">
              <div className="print-payment-label">المبلغ المتبقي</div>
              <div className="print-payment-value" style={{ 
                color: ((invoice.remaining_amount !== undefined ? invoice.remaining_amount : (invoice.total_amount - (invoice.total_paid || 0)))) > 0 ? '#dc2626' : '#059669'
              }}>
                {((invoice.remaining_amount !== undefined ? invoice.remaining_amount : (invoice.total_amount - (invoice.total_paid || 0)))).toLocaleString('ar-SA')} ر.س
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="print-notes">
            <strong>ملاحظات:</strong><br/>
            {invoice.notes}
          </div>
        )}

        {/* Stamp */}
        {companyInfo.stamp && (
          <div className="print-stamp">
            <img src={companyInfo.stamp} alt="ختم الوكالة" />
          </div>
        )}

        {/* Footer */}
        <div className="print-footer">
          <div className="print-footer-title">شكراً لك على التعامل معنا</div>
          {companyInfo.tagline && (
            <div className="print-footer-tagline">{companyInfo.tagline}</div>
          )}
          <div>للاستفسارات: {companyInfo.phone} | {companyInfo.email}</div>
        </div>
      </div>
    </>
  );
};

export default InvoicePrint;