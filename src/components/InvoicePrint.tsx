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
    logo?: string;
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
    <div className="print-invoice" style={{ display: 'none' }} dir="rtl">
      
      {/* Header with Logo */}
      <div style={{ 
        textAlign: 'center',
        marginBottom: '12px',
        borderBottom: '2px solid #000',
        paddingBottom: '8px'
      }}>
        {companyInfo.logo && (
          <div style={{ marginBottom: '8px' }}>
            <img 
              src={companyInfo.logo} 
              alt="شعار الشركة" 
              style={{ 
                width: '60px', 
                height: '60px', 
                objectFit: 'contain',
                margin: '0 auto',
                display: 'block'
              }}
            />
          </div>
        )}
        <h1 style={{ 
          fontSize: '20px', 
          fontWeight: 'bold', 
          margin: '0 0 6px 0',
          color: '#000'
        }}>
          {companyInfo.name}
        </h1>
        <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.4' }}>
          <div>{companyInfo.address}</div>
          <div>هاتف: {companyInfo.phone}</div>
          <div>البريد: {companyInfo.email}</div>
        </div>
      </div>

      {/* Invoice Info */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: '#f8f9fa', 
        padding: '8px', 
        border: '1px solid #ccc',
        borderRadius: '4px',
        marginBottom: '12px',
        fontSize: '12px'
      }}>
        <div>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            margin: '0 0 6px 0',
            color: '#000'
          }}>
            فاتورة
          </h2>
          <div style={{ fontSize: '11px', color: '#555' }}>
            <div><strong>رقم:</strong> {invoice.invoice_number}</div>
            <div><strong>التاريخ:</strong> {new Date(invoice.issue_date).toLocaleDateString('ar-SA')}</div>
            <div><strong>الاستحقاق:</strong> {new Date(invoice.due_date).toLocaleDateString('ar-SA')}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0066cc' }}>
            المبلغ: {invoice.total_amount} ر.س
          </div>
          <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
            نوع الدفع: {invoice.payment_type}
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
         fontSize: '12px',
         marginBottom: '8px'
       }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th style={{ 
              border: '1px solid #555', 
              padding: '2px', 
              textAlign: 'right',
              fontWeight: 'bold'
            }}>
              البند
            </th>
            <th style={{ 
              border: '1px solid #555', 
              padding: '2px', 
              textAlign: 'center',
              width: '15%'
            }}>
              الكمية
            </th>
            <th style={{ 
              border: '1px solid #555', 
              padding: '2px', 
              textAlign: 'center',
              width: '20%'
            }}>
              السعر
            </th>
            <th style={{ 
              border: '1px solid #555', 
              padding: '2px', 
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
                 border: '1px solid #555', 
                 padding: '2px',
                 fontSize: '11px'
               }}>
                {item.item_name}
              </td>
               <td style={{ 
                 border: '1px solid #555', 
                 padding: '2px', 
                 textAlign: 'center',
                 fontSize: '11px'
               }}>
                 {item.quantity}
               </td>
               <td style={{ 
                 border: '1px solid #555', 
                 padding: '2px', 
                 textAlign: 'center',
                 fontSize: '11px'
               }}>
                 {item.unit_price.toFixed(2)}
               </td>
               <td style={{ 
                 border: '1px solid #555', 
                 padding: '2px', 
                 textAlign: 'center',
                 fontSize: '11px'
               }}>
                {item.total_amount.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        marginBottom: '8px' 
      }}>
        <div style={{ width: '120px', fontSize: '12px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '2px 0',
            borderBottom: '1px solid #ccc'
          }}>
            <span>المجموع:</span>
            <span>{invoice.amount.toFixed(2)} ر.س</span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '2px 0',
            borderBottom: '1px solid #ccc'
          }}>
            <span>الضريبة:</span>
            <span>{invoice.tax_amount.toFixed(2)} ر.س</span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '3px 0',
             fontWeight: 'bold',
             fontSize: '13px',
            borderTop: '2px solid #000'
          }}>
            <span>الإجمالي:</span>
            <span>{invoice.total_amount.toFixed(2)} ر.س</span>
          </div>
        </div>
      </div>

      {/* Payment Info */}
      <div style={{ 
        display: 'flex', 
         justifyContent: 'space-between',
         fontSize: '11px',
        marginBottom: '6px',
        padding: '3px',
        backgroundColor: '#f9f9f9',
        border: '1px solid #ddd'
      }}>
        <span><strong>نوع الدفع:</strong> {invoice.payment_type}</span>
        <span><strong>الحالة:</strong> {invoice.status}</span>
      </div>

      {/* Notes */}
      {invoice.notes && (
         <div style={{ 
           fontSize: '11px',
          marginBottom: '6px',
          padding: '2px',
          fontStyle: 'italic',
          color: '#666'
        }}>
          <strong>ملاحظات:</strong> {invoice.notes}
        </div>
      )}

      {/* Footer */}
      <div style={{ 
         textAlign: 'center', 
         fontSize: '10px',
        color: '#888',
        borderTop: '1px solid #ccc',
        paddingTop: '3px',
        marginTop: '5px'
      }}>
        شكراً لثقتكم
      </div>
    </div>
  );
};

export default InvoicePrint;