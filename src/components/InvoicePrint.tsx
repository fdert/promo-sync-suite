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
        marginBottom: '5px',
        pageBreakInside: 'avoid'
      }}>
        <div style={{ width: '120px', fontSize: '11px' }}>
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
            borderTop: '2px solid #000'
          }}>
            <span>الإجمالي:</span>
            <span>{invoice.total_amount.toFixed(2)} ر.س</span>
          </div>
        </div>
      </div>

      {/* Status and Payment Info */}
      <div style={{ 
        backgroundColor: '#f0f8ff',
        border: '1px solid #cce7ff',
        borderRadius: '4px',
        padding: '8px',
        margin: '8px 0',
        fontSize: '10px',
        pageBreakInside: 'avoid'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          paddingBottom: '6px',
          borderBottom: '1px dashed #93c5fd'
        }}>
          <div>
            <span style={{ fontWeight: 'bold', color: '#1e40af' }}>حالة الفاتورة: </span>
            <span style={{
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '9px',
              fontWeight: 'bold',
              backgroundColor: (invoice.actual_status || invoice.payment_status || invoice.status) === 'مدفوعة' ? '#d4edda' : 
                            (invoice.actual_status || invoice.payment_status || invoice.status) === 'مدفوعة جزئياً' ? '#cce7ff' : '#fff3cd',
              color: (invoice.actual_status || invoice.payment_status || invoice.status) === 'مدفوعة' ? '#155724' : 
                     (invoice.actual_status || invoice.payment_status || invoice.status) === 'مدفوعة جزئياً' ? '#0066cc' : '#856404'
            }}>
              {invoice.actual_status || invoice.payment_status || invoice.status}
            </span>
          </div>
          <div>
            <span style={{ fontWeight: 'bold', color: '#1e40af' }}>نوع الدفع: </span>
            <span style={{ fontWeight: 'bold' }}>
              {invoice.actual_payment_type || invoice.payment_type || 'دفع آجل'}
            </span>
          </div>
        </div>
        
        {/* تفاصيل المدفوعات */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          gap: '15px'
        }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: '#6b7280', marginBottom: '2px' }}>إجمالي الفاتورة</div>
            <div style={{ fontWeight: 'bold', color: '#1e40af' }}>
              {invoice.total_amount.toFixed(2)} ر.س
            </div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: '#6b7280', marginBottom: '2px' }}>المبلغ المدفوع</div>
            <div style={{ fontWeight: 'bold', color: '#059669' }}>
              {(invoice.total_paid || 0).toFixed(2)} ر.س
            </div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: '#6b7280', marginBottom: '2px' }}>المبلغ المتبقي</div>
            <div style={{ 
              fontWeight: 'bold', 
              color: ((invoice.remaining_amount !== undefined ? invoice.remaining_amount : (invoice.total_amount - (invoice.total_paid || 0)))) > 0 ? '#dc2626' : '#059669'
            }}>
              {((invoice.remaining_amount !== undefined ? invoice.remaining_amount : (invoice.total_amount - (invoice.total_paid || 0)))).toFixed(2)} ر.س
            </div>
          </div>
        </div>
        
        {/* شريط تقدم الدفع */}
        {invoice.total_amount > 0 && (
          <div style={{ marginTop: '8px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '9px',
              marginBottom: '3px',
              color: '#6b7280'
            }}>
              <span>نسبة المدفوع</span>
              <span>{Math.round(((invoice.total_paid || 0) / invoice.total_amount) * 100)}%</span>
            </div>
            <div style={{ 
              width: '100%', 
              height: '6px', 
              backgroundColor: '#e5e7eb', 
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                width: `${Math.min(((invoice.total_paid || 0) / invoice.total_amount) * 100, 100)}%`,
                height: '100%', 
                backgroundColor: '#10b981',
                borderRadius: '3px'
              }} />
            </div>
          </div>
        )}
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