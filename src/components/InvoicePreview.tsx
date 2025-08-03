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
  onPrint: () => void;
  companyInfo?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logo?: string;
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
          <div className="bg-white p-8 border rounded-lg shadow-sm" dir="rtl">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 border-b-2 border-gray-300 pb-6">
              <div className="flex items-start gap-4">
                {companyInfo.logo && (
                  <img 
                    src={companyInfo.logo} 
                    alt="شعار الشركة" 
                    className="w-16 h-16 object-contain"
                  />
                )}
                <div>
                  <h1 className="text-4xl font-bold text-gray-800 mb-3">{companyInfo.name}</h1>
                   <div className="text-gray-600 text-lg">
                     <p>{companyInfo.address}</p>
                     <p>هاتف: {companyInfo.phone}</p>
                     <p>البريد الإلكتروني: {companyInfo.email}</p>
                   </div>
                </div>
              </div>
              <div className="text-left">
                 <h2 className="text-3xl font-bold text-gray-800 mb-3">فاتورة</h2>
                 <div className="text-gray-600 text-lg">
                   <p><strong>رقم الفاتورة:</strong> {invoice.invoice_number}</p>
                   <p><strong>تاريخ الإصدار:</strong> {new Date(invoice.issue_date).toLocaleDateString('ar-SA')}</p>
                   <p><strong>تاريخ الاستحقاق:</strong> {new Date(invoice.due_date).toLocaleDateString('ar-SA')}</p>
                 </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="mb-8">
               <h3 className="text-xl font-semibold text-gray-800 mb-4">بيانات العميل:</h3>
               <div className="bg-gray-50 p-6 rounded text-lg">
                 <p><strong>اسم العميل:</strong> {invoice.customers?.name}</p>
                 {invoice.customers?.phone && <p><strong>رقم الهاتف:</strong> {invoice.customers.phone}</p>}
                 {invoice.customers?.address && <p><strong>العنوان:</strong> {invoice.customers.address}</p>}
               </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
               <table className="w-full border-collapse border border-gray-300 text-lg">
                 <thead className="bg-gray-100">
                   <tr>
                     <th className="border border-gray-300 p-4 text-right">البند</th>
                     <th className="border border-gray-300 p-4 text-right">الوصف</th>
                     <th className="border border-gray-300 p-4 text-center">الكمية</th>
                     <th className="border border-gray-300 p-4 text-center">سعر الوحدة</th>
                     <th className="border border-gray-300 p-4 text-center">المجموع</th>
                   </tr>
                 </thead>
                 <tbody>
                   {items.map((item, index) => (
                     <tr key={index}>
                       <td className="border border-gray-300 p-4">{item.item_name}</td>
                       <td className="border border-gray-300 p-4">{item.description || '-'}</td>
                       <td className="border border-gray-300 p-4 text-center">{item.quantity}</td>
                       <td className="border border-gray-300 p-4 text-center">{item.unit_price.toFixed(2)} ر.س</td>
                       <td className="border border-gray-300 p-4 text-center">{item.total_amount.toFixed(2)} ر.س</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
               <div className="w-64 text-lg">
                 <div className="flex justify-between py-3 border-b border-gray-200">
                   <span>المجموع الفرعي:</span>
                   <span>{invoice.amount.toFixed(2)} ر.س</span>
                 </div>
                 <div className="flex justify-between py-3 border-b border-gray-200">
                   <span>الضريبة:</span>
                   <span>{invoice.tax_amount.toFixed(2)} ر.س</span>
                 </div>
                 <div className="flex justify-between py-4 font-bold text-xl border-t-2 border-gray-400">
                   <span>المجموع الكلي:</span>
                   <span>{invoice.total_amount.toFixed(2)} ر.س</span>
                 </div>
               </div>
            </div>

            {/* Payment Info & Notes */}
             <div className="grid grid-cols-2 gap-8 mb-8 text-lg">
               <div>
                 <h4 className="font-semibold text-gray-800 mb-3">معلومات الدفع:</h4>
                 <p><strong>نوع الدفع:</strong> {invoice.payment_type}</p>
                 <p><strong>حالة الفاتورة:</strong> {invoice.status}</p>
               </div>
               {invoice.notes && (
                 <div>
                   <h4 className="font-semibold text-gray-800 mb-3">ملاحظات:</h4>
                   <p className="text-gray-600">{invoice.notes}</p>
                 </div>
               )}
             </div>

            {/* Footer */}
             <div className="text-center text-gray-500 border-t border-gray-200 pt-6">
               <p className="text-lg">شكراً لك على التعامل معنا</p>
               <p>تم إنشاء هذه الفاتورة بتاريخ {new Date().toLocaleDateString('ar-SA')}</p>
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoicePreview;