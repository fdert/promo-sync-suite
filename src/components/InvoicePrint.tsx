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
    issue_date: string;
    due_date: string;
    amount: number;
    tax_amount: number;
    total_amount: number;
    status: string;
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
    <div className="print-content print:block" style={{ 
      position: 'absolute', 
      left: '-9999px', 
      width: '100%',
      fontSize: '12px',
      lineHeight: '1.3'
    }}>
      <div className="bg-white" style={{ 
        color: 'black', 
        padding: '10px',
        maxWidth: '100%',
        height: 'auto'
      }} dir="rtl">
        
        {/* Header مدمج */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          marginBottom: '15px',
          borderBottom: '2px solid #333',
          paddingBottom: '10px'
        }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              margin: '0 0 5px 0',
              color: '#000'
            }}>
              {companyInfo.name}
            </h1>
            <div style={{ fontSize: '10px', color: '#666' }}>
              <p style={{ margin: '2px 0' }}>{companyInfo.phone}</p>
            </div>
          </div>
          
          <div style={{ textAlign: 'left', flex: 1 }}>
            <h2 style={{ 
              fontSize: '16px', 
              fontWeight: 'bold', 
              margin: '0 0 5px 0',
              color: '#000'
            }}>
              فاتورة
            </h2>
            <div style={{ fontSize: '10px', color: '#666' }}>
              <p style={{ margin: '1px 0' }}>
                <strong>رقم:</strong> {invoice.invoice_number}
              </p>
              <p style={{ margin: '1px 0' }}>
                <strong>التاريخ:</strong> {new Date(invoice.issue_date).toLocaleDateString('ar-SA')}
              </p>
            </div>
          </div>
        </div>

        {/* بيانات العميل مبسطة */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '8px', 
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}>
            <p style={{ 
              margin: '0', 
              fontSize: '11px',
              fontWeight: 'bold'
            }}>
              العميل: {invoice.customers?.name}
            </p>
            {invoice.customers?.phone && (
              <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#666' }}>
                هاتف: {invoice.customers.phone}
              </p>
            )}
          </div>
        </div>

        {/* جدول البنود مبسط */}
        <div style={{ marginBottom: '12px' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: '10px'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ 
                  border: '1px solid #666', 
                  padding: '4px', 
                  textAlign: 'right',
                  fontWeight: 'bold'
                }}>
                  البند
                </th>
                <th style={{ 
                  border: '1px solid #666', 
                  padding: '4px', 
                  textAlign: 'center',
                  width: '15%'
                }}>
                  الكمية
                </th>
                <th style={{ 
                  border: '1px solid #666', 
                  padding: '4px', 
                  textAlign: 'center',
                  width: '20%'
                }}>
                  السعر
                </th>
                <th style={{ 
                  border: '1px solid #666', 
                  padding: '4px', 
                  textAlign: 'center',
                  width: '20%'
                }}>
                  المجموع
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td style={{ 
                    border: '1px solid #666', 
                    padding: '4px'
                  }}>
                    {item.item_name}
                  </td>
                  <td style={{ 
                    border: '1px solid #666', 
                    padding: '4px', 
                    textAlign: 'center'
                  }}>
                    {item.quantity}
                  </td>
                  <td style={{ 
                    border: '1px solid #666', 
                    padding: '4px', 
                    textAlign: 'center'
                  }}>
                    {item.unit_price.toFixed(2)}
                  </td>
                  <td style={{ 
                    border: '1px solid #666', 
                    padding: '4px', 
                    textAlign: 'center'
                  }}>
                    {item.total_amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* المجاميع */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          marginBottom: '12px' 
        }}>
          <div style={{ width: '150px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '3px 0',
              borderBottom: '1px solid #ddd',
              fontSize: '10px'
            }}>
              <span>المجموع:</span>
              <span>{invoice.amount.toFixed(2)} ر.س</span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '3px 0',
              borderBottom: '1px solid #ddd',
              fontSize: '10px'
            }}>
              <span>الضريبة:</span>
              <span>{invoice.tax_amount.toFixed(2)} ر.س</span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '5px 0',
              fontWeight: 'bold',
              fontSize: '12px',
              borderTop: '2px solid #333'
            }}>
              <span>الإجمالي:</span>
              <span>{invoice.total_amount.toFixed(2)} ر.س</span>
            </div>
          </div>
        </div>

        {/* معلومات إضافية مبسطة */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          fontSize: '10px',
          marginBottom: '10px'
        }}>
          <div>
            <p style={{ margin: '0' }}>
              <strong>نوع الدفع:</strong> {invoice.payment_type}
            </p>
            <p style={{ margin: '2px 0 0 0' }}>
              <strong>الحالة:</strong> {invoice.status}
            </p>
          </div>
          
          {invoice.notes && (
            <div style={{ maxWidth: '50%' }}>
              <p style={{ margin: '0', fontSize: '9px', color: '#666' }}>
                <strong>ملاحظات:</strong> {invoice.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer بسيط */}
        <div style={{ 
          textAlign: 'center', 
          fontSize: '8px', 
          color: '#999',
          borderTop: '1px solid #ddd',
          paddingTop: '5px'
        }}>
          <p style={{ margin: '0' }}>شكراً لثقتكم</p>
        </div>
      </div>
    </div>
  );
};

export default InvoicePrint;