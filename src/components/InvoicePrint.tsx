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
    <div className="print-invoice" style={{ 
      display: 'none',
      maxWidth: '100%',
      minHeight: '100vh',
      margin: '0',
      padding: '10px',
      boxSizing: 'border-box',
      fontSize: '11px',
      lineHeight: '1.2',
      pageBreakAfter: 'avoid'
    }} dir="rtl">
      
      {/* Header with Logo in Center */}
      <div style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
        borderBottom: '2px solid #000',
        paddingBottom: '6px',
        pageBreakInside: 'avoid'
      }}>
        {/* Company Info - Right Side */}
        <div style={{ flex: 1, textAlign: 'right' }}>
          <h1 style={{ 
            fontSize: '16px', 
            fontWeight: 'bold', 
            margin: '0 0 4px 0',
            color: '#000'
          }}>
            {companyInfo.name}
          </h1>
          <div style={{ fontSize: '10px', color: '#555', lineHeight: '1.3' }}>
            <div>{companyInfo.address}</div>
            <div>هاتف: {companyInfo.phone}</div>
            <div>البريد: {companyInfo.email}</div>
          </div>
        </div>
        
        {/* Logo - Center */}
        <div style={{ flexShrink: 0, margin: '0 12px' }}>
          {companyInfo.logo ? (
            <img 
              src={companyInfo.logo} 
              alt="شعار الشركة" 
              style={{ 
                width: '60px', 
                height: '60px', 
                objectFit: 'contain'
              }}
            />
          ) : (
            <div style={{
              width: '60px',
              height: '60px',
              backgroundColor: '#f0f0f0',
              border: '2px dashed #ccc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: '#999',
              textAlign: 'center'
            }}>
              شعار الشركة
            </div>
          )}
        </div>
        
        {/* Invoice Info - Left Side */}
        <div style={{ flex: 1, textAlign: 'left' }}>
          <h2 style={{ 
            fontSize: '16px', 
            fontWeight: 'bold', 
            margin: '0 0 4px 0',
            color: '#000'
          }}>
            فاتورة
          </h2>
          <div style={{ fontSize: '10px', color: '#555', lineHeight: '1.3' }}>
            <div><strong>رقم:</strong> {invoice.invoice_number}</div>
            <div><strong>التاريخ:</strong> {new Date(invoice.issue_date).toLocaleDateString('ar-SA')}</div>
            <div><strong>الاستحقاق:</strong> {new Date(invoice.due_date).toLocaleDateString('ar-SA')}</div>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '4px', 
         border: '1px solid #ccc',
         borderRadius: '2px',
         marginBottom: '8px',
         fontSize: '12px'
       }}>
        <span style={{ fontWeight: 'bold' }}>العميل: </span>{invoice.customers?.name}
        {invoice.customers?.phone && (
          <span style={{ marginLeft: '10px' }}>
            | هاتف: {invoice.customers.phone}
          </span>
        )}
      </div>

      {/* Items Table */}
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse',
        fontSize: '11px',
        marginBottom: '6px',
        pageBreakInside: 'avoid'
      }}>
        <thead>
          <tr style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#ffffff'
          }}>
            <th style={{ 
              border: '1px solid #555', 
              padding: '3px', 
              textAlign: 'center',
              width: '20%',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 'bold'
            }}>
              المجموع
            </th>
            <th style={{ 
              border: '1px solid #555', 
              padding: '3px', 
              textAlign: 'center',
              width: '20%',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 'bold'
            }}>
              السعر
            </th>
            <th style={{ 
              border: '1px solid #555', 
              padding: '3px', 
              textAlign: 'center',
              width: '15%',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 'bold'
            }}>
              الكمية
            </th>
            <th style={{ 
              border: '1px solid #555', 
              padding: '3px', 
              textAlign: 'right',
              fontWeight: 'bold',
              color: '#ffffff',
              fontSize: '11px'
            }}>
              البند
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td style={{ 
                border: '1px solid #555', 
                padding: '2px', 
                textAlign: 'center',
                fontSize: '10px'
              }}>
                {item.total_amount.toFixed(2)}
              </td>
              <td style={{ 
                border: '1px solid #555', 
                padding: '2px', 
                textAlign: 'center',
                fontSize: '10px'
              }}>
                {item.unit_price.toFixed(2)}
              </td>
              <td style={{ 
                border: '1px solid #555', 
                padding: '2px', 
                textAlign: 'center',
                fontSize: '10px'
              }}>
                {item.quantity}
              </td>
              <td style={{ 
                border: '1px solid #555', 
                padding: '2px',
                fontSize: '10px',
                textAlign: 'right'
              }}>
                {item.item_name}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        marginBottom: '8px',
        pageBreakInside: 'avoid'
      }}>
        <div style={{ width: '150px', fontSize: '11px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '1px 0',
            borderBottom: '1px solid #ccc'
          }}>
            <span>المجموع:</span>
            <span>{invoice.amount.toFixed(2)} ر.س</span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '1px 0',
            borderBottom: '1px solid #ccc'
          }}>
            <span>الضريبة:</span>
            <span>{invoice.tax_amount.toFixed(2)} ر.س</span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '2px 0',
            fontWeight: 'bold',
            fontSize: '12px',
            borderTop: '2px solid #000',
            marginBottom: '4px'
          }}>
            <span>الإجمالي:</span>
            <span>{invoice.total_amount.toFixed(2)} ر.س</span>
          </div>
          
          {/* Payment Details */}
          <div style={{
            backgroundColor: '#f0f8ff',
            border: '1px solid #ddd',
            padding: '4px',
            fontSize: '10px',
            marginTop: '2px'
          }}>
            <div style={{ 
              fontWeight: 'bold', 
              marginBottom: '2px',
              textAlign: 'center',
              borderBottom: '1px solid #ccc',
              paddingBottom: '1px'
            }}>
              تفاصيل الدفع
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '1px'
            }}>
              <span>المدفوع:</span>
              <span style={{ color: '#22c55e', fontWeight: 'bold' }}>
                {(invoice.total_paid || 0).toFixed(2)} ر.س
              </span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '1px'
            }}>
              <span>المتبقي:</span>
              <span style={{ 
                color: (invoice.remaining_amount || 0) > 0 ? '#ef4444' : '#22c55e', 
                fontWeight: 'bold' 
              }}>
                {(invoice.remaining_amount || 0).toFixed(2)} ر.س
              </span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '2px',
              borderTop: '1px dotted #ccc'
            }}>
              <span>الحالة:</span>
              <span style={{ 
                fontWeight: 'bold',
                color: (invoice.payment_status || invoice.actual_status || invoice.status) === 'مدفوعة' ? '#22c55e' : 
                       (invoice.payment_status || invoice.actual_status || invoice.status) === 'مدفوعة جزئياً' ? '#3b82f6' : '#ef4444'
              }}>
                {invoice.payment_status || invoice.actual_status || invoice.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div style={{ 
          fontSize: '10px',
          marginBottom: '4px',
          padding: '2px',
          fontStyle: 'italic',
          color: '#666',
          pageBreakInside: 'avoid'
        }}>
          <strong>ملاحظات:</strong> {invoice.notes}
        </div>
      )}

      {/* Stamp */}
      {companyInfo.stamp && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          margin: '25px 0 20px 0' 
        }}>
          <img 
            src={companyInfo.stamp} 
            alt="ختم الوكالة" 
            style={{ 
              width: '400px', 
              height: '400px', 
              objectFit: 'contain' 
            }}
          />
        </div>
      )}

      {/* Footer */}
      <div style={{ 
         textAlign: 'center', 
         fontSize: '10px',
        color: '#888',
        borderTop: '1px solid #ccc',
        paddingTop: '4px',
        marginTop: '6px'
      }}>
        <div style={{ 
          fontWeight: 'bold',
          marginBottom: '2px',
          fontSize: '11px'
        }}>
          شكراً لثقتكم
        </div>
        {companyInfo.tagline && (
          <div style={{ 
            fontStyle: 'italic',
            color: '#0066cc',
            fontSize: '9px',
            fontWeight: 'normal'
          }}>
            "{companyInfo.tagline}"
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoicePrint;