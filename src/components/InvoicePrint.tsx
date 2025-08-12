import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface InvoiceItem {
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
}

interface ElectronicInvoiceSettings {
  verification_enabled: boolean;
  verification_base_url: string;
  verification_message_ar: string;
  verification_message_en: string;
  qr_code_enabled: boolean;
  digital_signature_enabled: boolean;
  auto_generate_verification: boolean;
}

interface InvoicePrintProps {
  invoice: {
    id?: string;
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
  const [electronicSettings, setElectronicSettings] = useState<ElectronicInvoiceSettings | null>(null);

  useEffect(() => {
    const loadElectronicSettings = async () => {
      try {
        console.log('Loading electronic invoice settings...');
        const { data, error } = await supabase
          .from('website_settings')
          .select('setting_value')
          .eq('setting_key', 'electronic_invoice_settings')
          .single();

        console.log('Electronic settings data:', data);
        console.log('Electronic settings error:', error);

        if (data && !error && data.setting_value) {
          const settings = data.setting_value as any as ElectronicInvoiceSettings;
          console.log('Parsed electronic settings:', settings);
          setElectronicSettings(settings);
        }
      } catch (error) {
        console.error('Error loading electronic invoice settings:', error);
      }
    };

    loadElectronicSettings();
  }, []);

  // Generate verification link
  const getVerificationLink = () => {
    console.log('Generating verification link...');
    console.log('Electronic settings:', electronicSettings);
    console.log('Invoice ID:', invoice.id);
    console.log('Invoice object keys:', Object.keys(invoice));
    console.log('Verification enabled:', electronicSettings?.verification_enabled);
    
    // إجبار ظهور الرابط للاختبار
    if (electronicSettings?.verification_enabled) {
      const invoiceId = invoice.id || 'test-invoice-id';
      const link = `${electronicSettings.verification_base_url}/${invoiceId}`;
      console.log('Generated verification link:', link);
      return link;
    }
    
    console.log('Verification link not generated - conditions not met');
    return null;
  };
  return (
    <>
      <style type="text/css" media="print">
        {`
          /* إخفاء جميع العناصر الأخرى عند الطباعة */
          body * {
            visibility: hidden !important;
          }
          
          .print-invoice, .print-invoice * {
            visibility: visible !important;
          }
          
          .print-invoice {
            position: absolute !important;
            left: 0mm !important;
            top: 0 !important;
            transform: scale(1) !important;
            transform-origin: top left !important;
            width: 148mm !important;
            max-width: 148mm !important;
            direction: rtl !important;
            text-align: right !important;
            padding: 0 3mm !important;
            height: 200mm !important;
            max-height: 200mm !important;
          }
          
          @page {
            size: A5 portrait !important;
            margin: 5mm !important;
            padding: 0 !important;
          }
          
          html, body {
            height: 100% !important;
            overflow: hidden !important;
          }
          
          body {
            font-family: 'Arial', sans-serif !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #000 !important;
          }
          
          .print-invoice {
            display: block !important;
            font-family: 'Arial', sans-serif !important;
            font-size: 9px !important;
            line-height: 1.15 !important;
            color: #000 !important;
            background: white !important;
            width: 100% !important;
            max-width: 148mm !important;
            height: auto !important;
            max-height: 200mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            overflow: visible !important;
          }
          
          .print-invoice * {
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 0 !important;
            direction: rtl !important;
            text-align: right !important;
          }
          
          .print-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            margin-bottom: 1.5mm !important;
            border-bottom: 2px solid #2563eb !important;
            padding-bottom: 1.5mm !important;
            page-break-inside: avoid !important;
            position: relative !important;
          }
          
          .print-company-info {
            flex: 1 !important;
            text-align: right !important;
          }
          
          .print-company-name {
            font-size: 13px !important;
            font-weight: bold !important;
            margin-bottom: 0.5mm !important;
            color: #2563eb !important;
          }
          
          .print-company-details {
            font-size: 8px !important;
            color: #6b7280 !important;
            line-height: 1.2 !important;
            text-align: right !important;
            direction: rtl !important;
          }
          
          .print-company-details div {
            margin-bottom: 0.3mm !important;
          }
          
          .print-logo {
            flex-shrink: 0 !important;
            flex: 0 0 auto !important;
            margin: 0 auto !important;
            text-align: center !important;
            position: absolute !important;
            left: 50% !important;
            top: 0 !important;
            transform: translateX(-50%) !important;
          }
          
          .print-logo img {
            width: 8mm !important;
            height: 8mm !important;
            object-fit: contain !important;
          }
          
          .print-invoice-info {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            text-align: left !important;
            direction: ltr !important;
            width: auto !important;
            min-width: 40mm !important;
          }
          
          .print-invoice-title {
            font-size: 14px !important;
            font-weight: bold !important;
            margin-bottom: 0.8mm !important;
            color: #2563eb !important;
          }
          
          .print-invoice-details {
            font-size: 8px !important;
            color: #6b7280 !important;
            line-height: 1.2 !important;
          }
          
          .print-invoice-details div {
            margin-bottom: 0.3mm !important;
          }
          
          .print-customer-section {
            margin-bottom: 1.5mm !important;
          }
          
          .print-section-header {
            background-color: #f3f4f6 !important;
            padding: 1mm !important;
            border-right: 3px solid #2563eb !important;
            margin-bottom: 1mm !important;
            font-size: 8px !important;
            font-weight: bold !important;
            color: #374151 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print-customer-details {
            padding-right: 2mm !important;
            font-size: 8px !important;
          }
          
          .print-customer-name {
            font-weight: bold !important;
            font-size: 8.5px !important;
            margin-bottom: 0.5mm !important;
          }
          
          .print-customer-details div {
            margin-bottom: 0.3mm !important;
          }
          
          .print-items-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 7px !important;
            margin-bottom: 1.5mm !important;
            border: 1px solid #d1d5db !important;
          }
          
          .print-items-table th,
          .print-items-table td {
            border: 1px solid #d1d5db !important;
            padding: 0.6mm !important;
            text-align: center !important;
            vertical-align: middle !important;
          }
          
          .print-items-table th {
            background-color: #2563eb !important;
            color: white !important;
            font-weight: bold !important;
            font-size: 7px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print-items-table td:nth-child(4) {
            text-align: right !important;
          }
          
          .print-item-name {
            font-weight: bold !important;
            margin-bottom: 0.2mm !important;
          }
          
          .print-item-desc {
            font-size: 6px !important;
            color: #6b7280 !important;
          }
          
          .print-totals {
            margin-bottom: 1.5mm !important;
            text-align: right !important;
            direction: rtl !important;
          }
          
          .print-totals-box {
            display: inline-block !important;
            width: 35mm !important;
            font-size: 7.5px !important;
            margin-right: auto !important;
            text-align: right !important;
          }
          
          .print-total-row {
            display: flex !important;
            justify-content: space-between !important;
            padding: 0.3mm 0 !important;
            border-bottom: 0.3px solid #d1d5db !important;
          }
          
          .print-final-total {
            display: flex !important;
            justify-content: space-between !important;
            padding: 0.5mm 0 !important;
            font-weight: bold !important;
            font-size: 8px !important;
            border-top: 1px solid #2563eb !important;
            margin-top: 0.3mm !important;
          }
          
          .print-payment-info {
            background-color: #f0f9ff !important;
            border: 1px solid #bfdbfe !important;
            border-radius: 1mm !important;
            padding: 1.2mm !important;
            font-size: 6.5px !important;
            margin-bottom: 1.5mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print-payment-header {
            color: #2563eb !important;
            font-weight: bold !important;
            margin-bottom: 0.7mm !important;
            font-size: 7px !important;
          }
          
          .print-payment-row {
            display: flex !important;
            justify-content: space-between !important;
            margin-bottom: 0.5mm !important;
          }
          
          .print-payment-amounts {
            display: flex !important;
            justify-content: space-between !important;
            margin-top: 0.7mm !important;
            padding-top: 0.7mm !important;
            border-top: 1px solid #93c5fd !important;
          }
          
          .print-payment-amount {
            text-align: center !important;
            flex: 1 !important;
          }
          
          .print-payment-label {
            color: #6b7280 !important;
            font-size: 5.5px !important;
            margin-bottom: 0.2mm !important;
          }
          
          .print-payment-value {
            font-weight: bold !important;
            font-size: 6px !important;
          }
          
          .print-notes {
            font-size: 6.5px !important;
            margin-bottom: 1mm !important;
            background-color: #f9fafb !important;
            padding: 0.8mm !important;
            border-radius: 0.5mm !important;
            color: #6b7280 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
           .print-verification-stamp-section {
             display: flex !important;
             justify-content: space-between !important;
             align-items: flex-start !important;
             margin-bottom: 1.5mm !important;
           }

           .print-stamp-verification-container {
             display: flex !important;
             justify-content: space-between !important;
             align-items: center !important;
             width: 100% !important;
           }

           .print-verification-right {
             background-color: #f0f9ff !important;
             border: 1px solid #bfdbfe !important;
             border-radius: 1mm !important;
             padding: 1.2mm !important;
             font-size: 6.5px !important;
             text-align: right !important;
             direction: rtl !important;
             margin-left: 3mm !important;
             flex: 1 !important;
             -webkit-print-color-adjust: exact !important;
             print-color-adjust: exact !important;
           }

           .print-verification-message {
             color: #2563eb !important;
             font-weight: bold !important;
             margin-bottom: 0.7mm !important;
             font-size: 7px !important;
           }

           .print-verification-link {
             color: #1d4ed8 !important;
             font-size: 6px !important;
             word-break: break-all !important;
             margin-bottom: 0.5mm !important;
           }

            .print-verification-standalone {
              background-color: #f0f9ff !important;
              border: 1px solid #bfdbfe !important;
              border-radius: 1mm !important;
              padding: 1.2mm !important;
              font-size: 6.5px !important;
              text-align: center !important;
              margin-bottom: 1.5mm !important;
              direction: rtl !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .print-footer {
              text-align: center !important;
              font-size: 7px !important;
              color: #6b7280 !important;
              border-top: 0.3px solid #d1d5db !important;
              padding-top: 1mm !important;
              margin-top: 1.5mm !important;
              direction: rtl !important;
              width: 100% !important;
            }
           
           .print-footer-title {
             font-size: 7.5px !important;
             font-weight: bold !important;
             margin-bottom: 0.5mm !important;
           }
           
           .print-footer-tagline {
             font-size: 6.5px !important;
             color: #2563eb !important;
             font-style: italic !important;
             margin-bottom: 0.5mm !important;
           }
           
           .print-stamp {
             text-align: right !important;
             margin: 1mm 0 !important;
             direction: ltr !important;
           }
           
           .print-stamp img {
             width: 10mm !important;
             height: 8mm !important;
             object-fit: contain !important;
           }
           
           @media screen {
             .print-invoice {
               display: none !important;
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
                <th style={{ width: '8%' }}>#</th>
                <th style={{ width: '42%' }}>اسم البند / الخدمة</th>
                <th style={{ width: '12%' }}>الكمية</th>
                <th style={{ width: '18%' }}>السعر (ر.س)</th>
                <th style={{ width: '20%' }}>الإجمالي (ر.س)</th>
              </tr>
            </thead>
            <tbody>
              {items && items.length > 0 ? (
                items.map((item, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f9fafb' : 'white' }}>
                    <td style={{ fontWeight: 'bold' }}>{index + 1}</td>
                    <td>
                      <div className="print-item-name">{item.item_name}</div>
                      {item.description && (
                        <div className="print-item-desc">{item.description}</div>
                      )}
                    </td>
                    <td>{item.quantity}</td>
                    <td style={{ fontWeight: 'bold' }}>
                      {item.unit_price?.toLocaleString('ar-SA')}
                    </td>
                    <td style={{ fontWeight: 'bold', color: '#2563eb' }}>
                      {item.total_amount?.toLocaleString('ar-SA')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <td style={{ fontWeight: 'bold' }}>1</td>
                  <td>
                    <div className="print-item-name">خدمات عامة</div>
                    <div className="print-item-desc">{invoice.notes || 'خدمات متنوعة'}</div>
                  </td>
                  <td>1</td>
                  <td style={{ fontWeight: 'bold' }}>
                    {invoice.amount?.toLocaleString('ar-SA')}
                  </td>
                  <td style={{ fontWeight: 'bold', color: '#2563eb' }}>
                    {invoice.amount?.toLocaleString('ar-SA')}
                  </td>
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
            <div className="print-total-row" style={{ backgroundColor: '#fef3c7', padding: '0.4mm' }}>
              <span>ضريبة القيمة المضافة (15%):</span>
              <span style={{ color: '#d97706', fontWeight: 'bold' }}>{invoice.tax_amount?.toLocaleString('ar-SA')} ر.س</span>
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
            <strong style={{
              backgroundColor: (invoice.actual_status || invoice.payment_status || invoice.status) === 'مدفوعة' ? '#d1fae5' : 
                            (invoice.actual_status || invoice.payment_status || invoice.status) === 'مدفوعة جزئياً' ? '#dbeafe' :
                            (invoice.actual_status || invoice.payment_status || invoice.status) === 'قيد الانتظار' ? '#fef3c7' : '#fee2e2',
              color: (invoice.actual_status || invoice.payment_status || invoice.status) === 'مدفوعة' ? '#065f46' : 
                     (invoice.actual_status || invoice.payment_status || invoice.status) === 'مدفوعة جزئياً' ? '#1e40af' :
                     (invoice.actual_status || invoice.payment_status || invoice.status) === 'قيد الانتظار' ? '#92400e' : '#991b1b',
              padding: '0.4mm 0.8mm',
              borderRadius: '0.8mm',
              fontSize: '6.5px',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }}>
              {invoice.actual_status || invoice.payment_status || invoice.status}
            </strong>
          </div>
          
          <div className="print-payment-row">
            <span>نوع الدفع:</span>
            <strong style={{ color: '#2563eb' }}>
              {invoice.actual_payment_type || invoice.payment_type || 'دفع آجل'}
            </strong>
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

        {/* Electronic Invoice Verification - في سطر منفصل */}
        <div className="print-verification-standalone">
          <div className="print-verification-message">
            فاتورة إلكترونية معتمدة - يمكن التحقق من صحتها إلكترونياً
          </div>
          <div className="print-verification-link">
            للتحقق من صحة الفاتورة: https://e5a7747a-0935-46df-9ea9-1308e76636dc.lovableproject.com/verify/{invoice.id || "test"}
          </div>
        </div>

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