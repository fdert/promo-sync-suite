import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

interface InvoiceItem {
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
}

interface InvoicePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    invoice_number: string;
    order_id?: string;
    issue_date: string;
    due_date: string;
    amount: number;
    tax_amount: number;
    total_amount: number;
    status: string;
    payment_type: string;
    actual_status?: string;
    actual_payment_type?: string;
    payment_status?: string;
    total_paid?: number;
    remaining_amount?: number;
    notes?: string;
    customers?: {
      name: string;
      phone?: string;
      address?: string;
    };
  };
  items: InvoiceItem[];
  onPrint?: () => void;
  companyInfo?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    logo?: string;
    stamp?: string;
    tagline?: string;
  };
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ 
  isOpen, 
  onClose, 
  invoice, 
  items, 
  onPrint,
  companyInfo = {
    name: "شركتك",
    address: "عنوان الشركة",
    phone: "رقم الهاتف",
    email: "البريد الإلكتروني"
  }
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-bold">معاينة الفاتورة</DialogTitle>
          <div className="flex gap-2">
            <Button onClick={onPrint} size="sm" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
            <Button onClick={onClose} variant="outline" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="mt-6">
          <div className="bg-white p-6 border rounded-lg shadow-sm max-w-[148mm] mx-auto" dir="rtl" style={{ fontSize: '12px', lineHeight: '1.4' }}>
            {/* Header with Logo in Center */}
            <div className="flex justify-between items-start mb-6 border-b-2 border-blue-600 pb-4">
              {/* Company Info - Right Side */}
              <div className="flex-1 text-right">
                <h1 className="text-lg font-bold text-blue-600 mb-2">{companyInfo.name}</h1>
                <div className="text-gray-600 text-xs space-y-1">
                  <p>{companyInfo.address}</p>
                  <p>هاتف: {companyInfo.phone}</p>
                  <p>البريد: {companyInfo.email}</p>
                </div>
              </div>
              
              {/* Logo - Center */}
              <div className="flex-shrink-0 mx-4">
                {companyInfo.logo && (
                  <img 
                    src={companyInfo.logo} 
                    alt="شعار الشركة" 
                    className="w-12 h-12 object-contain"
                  />
                )}
              </div>
              
              {/* Invoice Info - Left Side */}
              <div className="flex-1 text-left">
                <h2 className="text-lg font-bold text-blue-600 mb-2">فاتورة</h2>
                <div className="text-gray-600 text-xs space-y-1">
                  <p><strong>رقم الفاتورة:</strong> {invoice.invoice_number}</p>
                  <p><strong>تاريخ الإصدار:</strong> {new Date(invoice.issue_date).toLocaleDateString('ar-SA')}</p>
                  <p><strong>تاريخ الاستحقاق:</strong> {new Date(invoice.due_date).toLocaleDateString('ar-SA')}</p>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="mb-4">
              <div className="bg-gray-50 p-2 border-r-4 border-blue-600 mb-2">
                <h3 className="text-sm font-bold text-gray-800 mb-1">بيانات العميل</h3>
              </div>
              <div className="pr-3 text-xs">
                <div className="font-bold text-sm mb-1">{invoice.customers?.name || 'غير محدد'}</div>
                {invoice.customers?.phone && <div>الهاتف: {invoice.customers.phone}</div>}
                {invoice.customers?.address && <div>العنوان: {invoice.customers.address}</div>}
              </div>
            </div>

            {/* Items Section */}
            <div className="mb-4">
              <div className="bg-gray-50 p-2 border-r-4 border-blue-600 mb-3">
                <h3 className="text-sm font-bold text-gray-800">تفاصيل الفاتورة</h3>
              </div>
              
              {/* Items Table */}
              <table className="w-full border-collapse border border-gray-300 text-xs">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="border border-gray-300 p-2 text-center w-24">الإجمالي (ر.س)</th>
                    <th className="border border-gray-300 p-2 text-center w-20">السعر (ر.س)</th>
                    <th className="border border-gray-300 p-2 text-center w-16">الكمية</th>
                    <th className="border border-gray-300 p-2 text-center w-40">اسم البند / الخدمة</th>
                    <th className="border border-gray-300 p-2 text-center w-8">#</th>
                  </tr>
                </thead>
                <tbody>
                  {items && items.length > 0 ? (
                    items.map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                        <td className="border border-gray-300 p-2 text-center font-bold text-blue-600">
                          {item.total_amount?.toLocaleString('ar-SA')}
                        </td>
                        <td className="border border-gray-300 p-2 text-center font-bold">
                          {item.unit_price?.toLocaleString('ar-SA')}
                        </td>
                        <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                        <td className="border border-gray-300 p-2 text-right">
                          <div className="font-bold mb-1">{item.item_name}</div>
                          {item.description && (
                            <div className="text-xs text-gray-600">{item.description}</div>
                          )}
                        </td>
                        <td className="border border-gray-300 p-2 text-center font-bold">{index + 1}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-2 text-center font-bold text-blue-600">
                        {invoice.amount?.toLocaleString('ar-SA')}
                      </td>
                      <td className="border border-gray-300 p-2 text-center font-bold">
                        {invoice.amount?.toLocaleString('ar-SA')}
                      </td>
                      <td className="border border-gray-300 p-2 text-center">1</td>
                      <td className="border border-gray-300 p-2 text-right">
                        <div className="font-bold mb-1">خدمات عامة</div>
                        <div className="text-xs text-gray-600">{invoice.notes || 'خدمات متنوعة'}</div>
                      </td>
                      <td className="border border-gray-300 p-2 text-center font-bold">1</td>
                    </tr>
                  )}
                  
                  {/* إجمالي البنود */}
                  <tr className="bg-blue-50 border-t-2 border-blue-600">
                    <td className="border border-gray-300 p-2 text-center font-bold text-blue-600">
                      {invoice.amount?.toLocaleString('ar-SA')}
                    </td>
                    <td colSpan={4} className="border border-gray-300 p-2 text-right font-bold">
                      المجموع الفرعي:
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="mb-4">
              <div className="border-t border-gray-300 pt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>المجموع الفرعي:</span>
                  <span className="font-bold">{invoice.amount?.toLocaleString('ar-SA')} ر.س</span>
                </div>
                <div className="flex justify-between text-xs mb-1 bg-yellow-50 p-1 rounded">
                  <span>ضريبة القيمة المضافة (15%):</span>
                  <span className="font-bold text-yellow-700">{invoice.tax_amount?.toLocaleString('ar-SA')} ر.س</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-blue-600 pt-1 mb-2">
                  <span>إجمالي المبلغ المستحق:</span>
                  <span className="text-blue-600">{invoice.total_amount?.toLocaleString('ar-SA')} ر.س</span>
                </div>
                
                {/* Payment Details Section */}
                <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-3">
                  <h4 className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-2">
                    <span>💰</span>
                    <span>تفاصيل المدفوعات</span>
                  </h4>
                  
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="text-center">
                      <div className="text-gray-600 mb-1">المبلغ المدفوع</div>
                      <div className="font-bold text-green-600 text-sm">
                        {(invoice.total_paid || 0).toLocaleString('ar-SA')} ر.س
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-gray-600 mb-1">المبلغ المتبقي</div>
                      <div className={`font-bold text-sm ${
                        (invoice.remaining_amount || invoice.total_amount) > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {(invoice.remaining_amount || invoice.total_amount || 0).toLocaleString('ar-SA')} ر.س
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-gray-600 mb-1">حالة الدفع</div>
                      <div className={`font-bold text-xs px-2 py-1 rounded ${
                        (invoice.payment_status || invoice.actual_status || invoice.status) === 'مدفوعة' ? 'bg-green-100 text-green-700' : 
                        (invoice.payment_status || invoice.actual_status || invoice.status) === 'مدفوعة جزئياً' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {invoice.payment_status || invoice.actual_status || invoice.status}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  {invoice.total_amount > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>نسبة السداد</span>
                        <span>{Math.round(((invoice.total_paid || 0) / invoice.total_amount) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min(((invoice.total_paid || 0) / invoice.total_amount) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Total Section with Stamp */}
            <div className="flex justify-between items-center border-t-2 border-blue-600 pt-3 mb-4">
              <div className="text-lg font-bold text-blue-600">
                المجموع الكلي: {invoice.total_amount?.toLocaleString('ar-SA')} ر.س
              </div>
              <div className="text-center">
                 {companyInfo.stamp && (
                   <img 
                     src={companyInfo.stamp} 
                     alt="ختم الوكالة" 
                     className="w-20 h-16 object-contain"
                   />
                 )}
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="mb-4">
                <div className="bg-gray-50 p-2 rounded text-xs">
                  <strong>ملاحظات:</strong><br/>
                  {invoice.notes}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-gray-500 border-t border-gray-200 pt-3">
              <p className="text-sm font-bold mb-1">شكراً لك على التعامل معنا</p>
              {companyInfo.tagline && (
                <p className="text-xs text-blue-600 italic mb-2">
                  {companyInfo.tagline}
                </p>
              )}
              <p className="text-xs">للاستفسارات: {companyInfo.phone} | {companyInfo.email}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoicePreview;