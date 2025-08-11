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
      maxWidth: '210mm',
      height: '297mm',
      margin: '0',
      padding: '10mm',
      boxSizing: 'border-box',
      fontSize: '10px',
      lineHeight: '1.3',
      pageBreakAfter: 'avoid',
      fontFamily: 'Arial, sans-serif'
    }} dir="rtl">
      
      {/* Header with Logo in Center */}
      <div style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'start',
        marginBottom: '6mm',
        borderBottom: '2px solid #2563eb',
        paddingBottom: '3mm',
        pageBreakInside: 'avoid'
      }}>
        {/* Company Info - Right Side */}
        <div style={{ flex: 1, textAlign: 'right' }}>
          <h1 style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            margin: '0 0 3px 0',
            color: '#2563eb'
          }}>
            {companyInfo.name}
          </h1>
          <div style={{ fontSize: '9px', color: '#6b7280', lineHeight: '1.3' }}>
            <div>{companyInfo.address}</div>
            <div>هاتف: {companyInfo.phone}</div>
            <div>البريد: {companyInfo.email}</div>
          </div>
        </div>
        
        {/* Logo - Center */}
        <div style={{ flexShrink: 0, margin: '0 8px' }}>
          {companyInfo.logo ? (
            <img 
              src={companyInfo.logo} 
              alt="شعار الشركة" 
              style={{ 
                width: '40px', 
                height: '40px', 
                objectFit: 'contain'
              }}
            />
          ) : (
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#f3f4f6',
              border: '1px dashed #d1d5db',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              color: '#9ca3af',
              textAlign: 'center'
            }}>
              شعار
            </div>
          )}
        </div>
        
        {/* Invoice Info - Left Side */}
        <div style={{ flex: 1, textAlign: 'left' }}>
          <h2 style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            margin: '0 0 3px 0',
            color: '#2563eb'
          }}>
            فاتورة
          </h2>
          <div style={{ fontSize: '9px', color: '#6b7280', lineHeight: '1.3' }}>
            <div><strong>رقم الفاتورة:</strong> {invoice.invoice_number}</div>
            <div><strong>تاريخ الإصدار:</strong> {new Date(invoice.issue_date).toLocaleDateString('ar-SA')}</div>
            <div><strong>تاريخ الاستحقاق:</strong> {new Date(invoice.due_date).toLocaleDateString('ar-SA')}</div>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div style={{ 
        marginBottom: '3mm'
      }}>
        <div style={{ 
          backgroundColor: '#f9fafb',
          padding: '2mm',
          borderRight: '4px solid #2563eb',
          marginBottom: '2mm'
        }}>
          <h3 style={{ 
            fontSize: '10px', 
            fontWeight: 'bold', 
            color: '#374151',
            margin: '0 0 1mm 0'
          }}>
            بيانات العميل
          </h3>
        </div>
        <div style={{ paddingRight: '3mm', fontSize: '9px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '1mm' }}>
            {invoice.customers?.name || 'غير محدد'}
          </div>
          {invoice.customers?.phone && <div>الهاتف: {invoice.customers.phone}</div>}
          {invoice.customers?.address && <div>العنوان: {invoice.customers.address}</div>}
        </div>
      </div>

      {/* Items Section */}
      <div style={{ marginBottom: '3mm' }}>
        <div style={{ 
          backgroundColor: '#f9fafb',
          padding: '2mm',
          borderRight: '4px solid #2563eb',
          marginBottom: '2mm'
        }}>
          <h3 style={{ 
            fontSize: '10px', 
            fontWeight: 'bold', 
            color: '#374151',
            margin: '0'
          }}>
            تفاصيل الفاتورة
          </h3>
        </div>
        
        {/* Items Table */}
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          fontSize: '9px',
          marginBottom: '3mm'
        }}>
          <thead>
            <tr style={{ 
              backgroundColor: '#2563eb',
              color: '#ffffff'
            }}>
              <th style={{ 
                border: '1px solid #d1d5db', 
                padding: '2mm', 
                textAlign: 'center',
                width: '20%',
                fontSize: '9px',
                fontWeight: 'bold'
              }}>
                الإجمالي (ر.س)
              </th>
              <th style={{ 
                border: '1px solid #d1d5db', 
                padding: '2mm', 
                textAlign: 'center',
                width: '18%',
                fontSize: '9px',
                fontWeight: 'bold'
              }}>
                السعر (ر.س)
              </th>
              <th style={{ 
                border: '1px solid #d1d5db', 
                padding: '2mm', 
                textAlign: 'center',
                width: '12%',
                fontSize: '9px',
                fontWeight: 'bold'
              }}>
                الكمية
              </th>
              <th style={{ 
                border: '1px solid #d1d5db', 
                padding: '2mm', 
                textAlign: 'center',
                width: '42%',
                fontSize: '9px',
                fontWeight: 'bold'
              }}>
                اسم البند / الخدمة
              </th>
              <th style={{ 
                border: '1px solid #d1d5db', 
                padding: '2mm', 
                textAlign: 'center',
                width: '8%',
                fontSize: '9px',
                fontWeight: 'bold'
              }}>
                #
              </th>
            </tr>
          </thead>
          <tbody>
            {items && items.length > 0 ? (
              items.map((item, index) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f9fafb' : '#ffffff' }}>
                  <td style={{ 
                    border: '1px solid #d1d5db', 
                    padding: '1.5mm', 
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#2563eb'
                  }}>
                    {item.total_amount?.toLocaleString('ar-SA')}
                  </td>
                  <td style={{ 
                    border: '1px solid #d1d5db', 
                    padding: '1.5mm', 
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>
                    {item.unit_price?.toLocaleString('ar-SA')}
                  </td>
                  <td style={{ 
                    border: '1px solid #d1d5db', 
                    padding: '1.5mm', 
                    textAlign: 'center'
                  }}>
                    {item.quantity}
                  </td>
                  <td style={{ 
                    border: '1px solid #d1d5db', 
                    padding: '1.5mm',
                    textAlign: 'right'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '1mm' }}>{item.item_name}</div>
                    {item.description && (
                      <div style={{ fontSize: '8px', color: '#6b7280' }}>{item.description}</div>
                    )}
                  </td>
                  <td style={{ 
                    border: '1px solid #d1d5db', 
                    padding: '1.5mm', 
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>
                    {index + 1}
                  </td>
                </tr>
              ))
            ) : (
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <td style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '1.5mm', 
                  textAlign: 'center',
                  fontWeight: 'bold',
                  color: '#2563eb'
                }}>
                  {invoice.amount?.toLocaleString('ar-SA')}
                </td>
                <td style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '1.5mm', 
                  textAlign: 'center',
                  fontWeight: 'bold'
                }}>
                  {invoice.amount?.toLocaleString('ar-SA')}
                </td>
                <td style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '1.5mm', 
                  textAlign: 'center'
                }}>
                  1
                </td>
                <td style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '1.5mm',
                  textAlign: 'right'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '1mm' }}>خدمات عامة</div>
                  <div style={{ fontSize: '8px', color: '#6b7280' }}>{invoice.notes || 'خدمات متنوعة'}</div>
                </td>
                <td style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '1.5mm', 
                  textAlign: 'center',
                  fontWeight: 'bold'
                }}>
                  1
                </td>
              </tr>
            )}
            
            {/* إجمالي البنود */}
            <tr style={{ backgroundColor: '#dbeafe', borderTop: '2px solid #2563eb' }}>
              <td style={{ 
                border: '1px solid #d1d5db', 
                padding: '1.5mm', 
                textAlign: 'center',
                fontWeight: 'bold',
                color: '#2563eb'
              }}>
                {invoice.amount?.toLocaleString('ar-SA')}
              </td>
              <td colSpan={4} style={{ 
                border: '1px solid #d1d5db', 
                padding: '1.5mm', 
                textAlign: 'right',
                fontWeight: 'bold'
              }}>
                المجموع الفرعي:
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Totals Summary */}
      <div style={{ marginBottom: '3mm' }}>
        <div style={{ borderTop: '1px solid #d1d5db', paddingTop: '2mm' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: '9px',
            marginBottom: '1mm'
          }}>
            <span>المجموع الفرعي:</span>
            <span style={{ fontWeight: 'bold' }}>{invoice.amount?.toLocaleString('ar-SA')} ر.س</span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: '9px',
            marginBottom: '1mm',
            backgroundColor: '#fef3c7',
            padding: '1mm',
            borderRadius: '2px'
          }}>
            <span>ضريبة القيمة المضافة (15%):</span>
            <span style={{ fontWeight: 'bold', color: '#d97706' }}>{invoice.tax_amount?.toLocaleString('ar-SA')} ر.س</span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: '10px',
            fontWeight: 'bold',
            borderTop: '1px solid #2563eb',
            paddingTop: '1mm'
          }}>
            <span>إجمالي المبلغ المستحق:</span>
            <span style={{ color: '#2563eb' }}>{invoice.total_amount?.toLocaleString('ar-SA')} ر.س</span>
          </div>
        </div>
      </div>

      {/* Payment Info */}
      <div style={{ 
        backgroundColor: '#dbeafe',
        padding: '3mm',
        borderRadius: '2mm',
        fontSize: '9px',
        marginBottom: '3mm'
      }}>
        <strong style={{ color: '#2563eb', display: 'block', marginBottom: '2mm' }}>معلومات الدفع والحالة:</strong>
        
        {/* معلومات الحالة */}
        <div style={{ marginBottom: '2mm' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1mm'
          }}>
            <span style={{ color: '#6b7280' }}>حالة الفاتورة:</span>
            <span style={{
              fontWeight: 'bold',
              padding: '1mm 2mm',
              borderRadius: '2mm',
              fontSize: '8px',
              backgroundColor: (invoice.actual_status || invoice.payment_status || invoice.status) === 'مدفوعة' ? '#d1fae5' : 
                            (invoice.actual_status || invoice.payment_status || invoice.status) === 'مدفوعة جزئياً' ? '#dbeafe' :
                            (invoice.actual_status || invoice.payment_status || invoice.status) === 'قيد الانتظار' ? '#fef3c7' :
                            '#fee2e2',
              color: (invoice.actual_status || invoice.payment_status || invoice.status) === 'مدفوعة' ? '#065f46' : 
                     (invoice.actual_status || invoice.payment_status || invoice.status) === 'مدفوعة جزئياً' ? '#1e40af' :
                     (invoice.actual_status || invoice.payment_status || invoice.status) === 'قيد الانتظار' ? '#92400e' :
                     '#991b1b'
            }}>
              {invoice.actual_status || invoice.payment_status || invoice.status}
            </span>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center'
          }}>
            <span style={{ color: '#6b7280' }}>نوع الدفع:</span>
            <span style={{ fontWeight: 'bold', color: '#2563eb' }}>
              {invoice.actual_payment_type || invoice.payment_type || 'دفع آجل'}
            </span>
          </div>
        </div>

        {/* تفاصيل المدفوعات */}
        <div style={{ 
          borderTop: '1px solid #93c5fd',
          paddingTop: '2mm'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            gap: '3mm',
            fontSize: '8px'
          }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ color: '#6b7280', marginBottom: '1mm' }}>إجمالي الفاتورة</div>
              <div style={{ fontWeight: 'bold', color: '#2563eb' }}>
                {invoice.total_amount?.toLocaleString('ar-SA')} ر.س
              </div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ color: '#6b7280', marginBottom: '1mm' }}>المبلغ المدفوع</div>
              <div style={{ fontWeight: 'bold', color: '#059669' }}>
                {(invoice.total_paid || 0).toLocaleString('ar-SA')} ر.س
              </div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ color: '#6b7280', marginBottom: '1mm' }}>المبلغ المتبقي</div>
              <div style={{ 
                fontWeight: 'bold', 
                color: ((invoice.remaining_amount !== undefined ? invoice.remaining_amount : (invoice.total_amount - (invoice.total_paid || 0)))) > 0 ? '#dc2626' : '#059669'
              }}>
                {((invoice.remaining_amount !== undefined ? invoice.remaining_amount : (invoice.total_amount - (invoice.total_paid || 0)))).toLocaleString('ar-SA')} ر.س
              </div>
            </div>
          </div>
          
          {/* شريط تقدم الدفع */}
          {invoice.total_amount > 0 && (
            <div style={{ marginTop: '2mm' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: '8px',
                marginBottom: '1mm',
                color: '#6b7280'
              }}>
                <span>نسبة المدفوع</span>
                <span>{Math.round(((invoice.total_paid || 0) / invoice.total_amount) * 100)}%</span>
              </div>
              <div style={{ 
                width: '100%', 
                height: '3mm', 
                backgroundColor: '#e5e7eb', 
                borderRadius: '1.5mm',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  width: `${Math.min(((invoice.total_paid || 0) / invoice.total_amount) * 100, 100)}%`,
                  height: '100%', 
                  backgroundColor: '#10b981',
                  borderRadius: '1.5mm'
                }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div style={{ 
          fontSize: '9px',
          marginBottom: '3mm',
          backgroundColor: '#f9fafb',
          padding: '2mm',
          borderRadius: '2mm',
          color: '#6b7280'
        }}>
          <strong>ملاحظات:</strong><br/>
          {invoice.notes}
        </div>
      )}

      {/* Total Section with Stamp */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderTop: '2px solid #2563eb',
        paddingTop: '3mm',
        marginBottom: '3mm'
      }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb' }}>
          المجموع الكلي: {invoice.total_amount?.toLocaleString('ar-SA')} ر.س
        </div>
        <div style={{ textAlign: 'center' }}>
          {companyInfo.stamp && (
            <img 
              src={companyInfo.stamp} 
              alt="ختم الوكالة" 
              style={{ 
                width: '15mm', 
                height: '12mm', 
                objectFit: 'contain' 
              }}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        textAlign: 'center', 
        fontSize: '9px',
        color: '#6b7280',
        borderTop: '1px solid #d1d5db',
        paddingTop: '2mm'
      }}>
        <p style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '1mm' }}>شكراً لك على التعامل معنا</p>
        {companyInfo.tagline && (
          <p style={{ 
            fontSize: '8px', 
            color: '#2563eb', 
            fontStyle: 'italic',
            marginBottom: '1mm'
          }}>
            {companyInfo.tagline}
          </p>
        )}
        <p style={{ fontSize: '8px' }}>للاستفسارات: {companyInfo.phone} | {companyInfo.email}</p>
      </div>
    </div>
  );
};

export default InvoicePrint;