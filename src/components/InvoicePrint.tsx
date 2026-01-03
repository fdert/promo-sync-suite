import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface InvoiceItem {
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
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
    vatNumber?: string;
  };
}

// دالة تحويل الرقم إلى كلمات عربية
const numberToArabicWords = (num: number): string => {
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  
  if (num === 0) return 'صفر';
  
  const intPart = Math.floor(num);
  const decimalPart = Math.round((num - intPart) * 100);
  
  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const one = n % 10;
      return one ? `${ones[one]} و${tens[ten]}` : tens[ten];
    }
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    return remainder ? `${hundreds[hundred]} و${convertLessThanThousand(remainder)}` : hundreds[hundred];
  };
  
  let result = '';
  if (intPart >= 1000) {
    const thousands = Math.floor(intPart / 1000);
    const remainder = intPart % 1000;
    if (thousands === 1) result = 'ألف';
    else if (thousands === 2) result = 'ألفان';
    else if (thousands <= 10) result = `${convertLessThanThousand(thousands)} آلاف`;
    else result = `${convertLessThanThousand(thousands)} ألف`;
    if (remainder) result += ` و${convertLessThanThousand(remainder)}`;
  } else {
    result = convertLessThanThousand(intPart);
  }
  
  result += ' ريال سعودي';
  if (decimalPart > 0) {
    result += ` و${convertLessThanThousand(decimalPart)} هللة`;
  }
  
  return result;
};

const InvoicePrint: React.FC<InvoicePrintProps> = ({ 
  invoice, 
  items, 
  companyInfo = {
    name: "وكالة إبداع واحتراف للدعاية والإعلان",
    address: "المملكة العربية السعودية",
    phone: "رقم الهاتف",
    email: "البريد الإلكتروني",
    vatNumber: "301201976300003"
  }
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Generate verification URL for QR Code
  const generateVerificationUrl = (): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/verify/${invoice.id}`;
  };

  // Generate QR Code as Data URL
  const generateQRCodeDataUrl = async (data: string): Promise<string> => {
    try {
      const QRCode = await import('qrcode');
      return await QRCode.toDataURL(data, {
        width: 150,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      return '';
    }
  };

  useEffect(() => {
    const loadQRCode = async () => {
      const url = generateVerificationUrl();
      const dataUrl = await generateQRCodeDataUrl(url);
      setQrCodeDataUrl(dataUrl);
    };
    loadQRCode();
  }, [invoice.id]);

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
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 210mm !important;
            direction: rtl !important;
            text-align: right !important;
            padding: 10mm !important;
          }
          
          @page {
            size: A4 !important;
            margin: 10mm !important;
          }
          
          html, body {
            width: 210mm !important;
            overflow: visible !important;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #000 !important;
            background: white !important;
          }
          
          .print-invoice {
            display: block !important;
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif !important;
            font-size: 12px !important;
            line-height: 1.4 !important;
            color: #000 !important;
            background: white !important;
          }
          
          .no-print {
            display: none !important;
          }
        `}
      </style>
      
      <div className="print-invoice bg-white text-black" style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header - White Background with Black Text */}
        <div className="bg-white text-black p-5 flex justify-between items-center border-b-2 border-gray-800" style={{ backgroundColor: '#ffffff', borderBottom: '2px solid #333' }}>
          <div className="text-right">
            <h3 className="text-lg font-bold text-black" style={{ fontSize: '18px', fontWeight: 'bold', color: '#000', marginBottom: '5px' }}>{companyInfo.name || "وكالة إبداع واحتراف للدعاية والإعلان"}</h3>
            <p className="text-sm text-gray-600" style={{ fontSize: '12px', color: '#666' }}>للدعاية والإعلان</p>
          </div>
          <div className="text-center" style={{ textAlign: 'center' }}>
            <h1 className="text-xl font-bold text-black" style={{ fontSize: '20px', fontWeight: 'bold', color: '#000' }}>فاتورة ضريبية مبسطة</h1>
            <h2 className="text-sm text-gray-600" style={{ fontSize: '14px', color: '#666' }}>Simplified Tax Invoice</h2>
          </div>
          {companyInfo.logo && (
            <img src={companyInfo.logo} alt="Logo" style={{ height: '60px', width: '60px', objectFit: 'contain' }} />
          )}
        </div>

        {/* Invoice Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '15px', borderBottom: '1px solid #ddd' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#666' }}>Invoice number / رقم الفاتورة</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#000' }}>{invoice.invoice_number}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#666' }}>Bill to / الفاتورة إلى</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#000' }}>{invoice.customers?.name || 'غير محدد'}</div>
            <div style={{ fontSize: '10px', color: '#666' }}>{companyInfo.address || "المملكة العربية السعودية"}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#666' }}>Date / التاريخ</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#000' }}>{invoice.issue_date}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#666' }}>Due date / تاريخ الاستحقاق</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#000' }}>{invoice.due_date || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#666' }}>VAT number / الرقم الضريبي</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#000' }}>{companyInfo.vatNumber || "301201976300003"}</div>
          </div>
        </div>

        {/* Total Due Box */}
        <div style={{ background: '#f5f5f5', padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Total due (VAT Inclusive) / المبلغ المستحق (شامل الضريبة)</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#000' }}>SAR {invoice.total_amount?.toFixed(2)}</div>
        </div>

        {/* Items Table - Gray Header */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#6b7280', color: 'white' }}>
              <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #6b7280' }}>Item</th>
              <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #6b7280' }}>Description / الوصف</th>
              <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #6b7280' }}>Quantity / الكمية</th>
              <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #6b7280' }}>Price / السعر</th>
              <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #6b7280' }}>Amount / المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {items && items.length > 0 ? (
              items.map((item, index) => (
                <tr key={index} style={{ background: index % 2 === 0 ? '#ffffff' : '#f5f5f5' }}>
                  <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}>{index + 1}</td>
                  <td style={{ padding: '12px', textAlign: 'right', border: '1px solid #ddd' }}>{item.item_name}</td>
                  <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}>{item.quantity}</td>
                  <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}>{item.unit_price?.toFixed(2)}</td>
                  <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}>{(item.total_amount || item.quantity * item.unit_price)?.toFixed(2)}</td>
                </tr>
              ))
            ) : (
              <tr style={{ background: '#ffffff' }}>
                <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}>1</td>
                <td style={{ padding: '12px', textAlign: 'right', border: '1px solid #ddd' }}>خدمات عامة</td>
                <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}>1</td>
                <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}>{invoice.amount?.toFixed(2)}</td>
                <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}>{invoice.amount?.toFixed(2)}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Summary */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '15px' }}>
          <div style={{ width: '300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid #333', fontWeight: 'bold', fontSize: '16px', color: '#000' }}>
              <span>الإجمالي (شامل الضريبة):</span>
              <span>SAR {invoice.total_amount?.toFixed(2)}</span>
            </div>
            <div style={{ padding: '10px 0', fontSize: '12px', color: '#333', textAlign: 'center', background: '#f9f9f9', borderRadius: '5px', marginTop: '5px' }}>
              <strong>المبلغ كتابة:</strong> {numberToArabicWords(invoice.total_amount || 0)}
            </div>
          </div>
        </div>

        {/* QR Code Section */}
        <div style={{ background: '#f9f9f9', padding: '20px', textAlign: 'center', borderTop: '1px solid #ddd' }}>
          <div style={{ marginBottom: '15px' }}>
            {qrCodeDataUrl && (
              <img src={qrCodeDataUrl} alt="QR Code" style={{ width: '150px', height: '150px', margin: '0 auto' }} />
            )}
          </div>
          <p style={{ fontSize: '12px', color: '#333', fontWeight: '500', marginBottom: '8px' }}>يمكنك التحقق من صحة الفاتورة بمسح رمز QR</p>
          <p style={{ fontSize: '11px', color: '#666', lineHeight: '1.6' }}>هذه فاتورة إلكترونية ولا تحتاج إلى ختم</p>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '10px', fontSize: '12px', color: '#666', borderTop: '1px solid #ddd' }}>
          <p>{companyInfo.name || "وكالة إبداع واحتراف للدعاية والإعلان"}</p>
          <p>Page 1 of 1 - {invoice.invoice_number}</p>
        </div>
      </div>
    </>
  );
};

export default InvoicePrint;