import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

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
    id?: string;
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
    payment_status?: string;
    actual_payment_type?: string;
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

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ 
  isOpen, 
  onClose, 
  invoice, 
  items, 
  onPrint,
  companyInfo = {
    name: "وكالة إبداع واحتراف للدعاية والإعلان",
    address: "المملكة العربية السعودية",
    phone: "رقم الهاتف",
    email: "البريد الإلكتروني",
    vatNumber: "301201976300003"
  }
}) => {
  // Generate verification URL for QR Code
  const generateVerificationUrl = (): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/verify/${invoice.id}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>فاتورة ضريبية مبسطة</span>
            <Button size="sm" onClick={onPrint}>
              <Printer className="h-4 w-4 ml-2" /> طباعة
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="bg-white text-black">
          <div className="invoice-container">
            {/* Header - White Background with Black Text */}
            <div className="bg-white text-black p-5 flex justify-between items-center border-b-2 border-gray-800">
              <div className="text-right">
                <h3 className="text-lg font-bold text-black">{companyInfo.name || "وكالة إبداع واحتراف للدعاية والإعلان"}</h3>
                <p className="text-sm text-gray-600">للدعاية والإعلان</p>
              </div>
              <div className="text-center">
                <h1 className="text-xl font-bold text-black">فاتورة ضريبية مبسطة</h1>
                <h2 className="text-sm text-gray-600">Simplified Tax Invoice</h2>
              </div>
              {companyInfo.logo && (
                <img src={companyInfo.logo} alt="Logo" className="h-16 w-16 object-contain" />
              )}
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-4 p-4 border-b">
              <div>
                <div className="text-xs text-gray-500">Invoice number / رقم الفاتورة</div>
                <div className="font-bold text-black">{invoice.invoice_number}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Bill to / الفاتورة إلى</div>
                <div className="font-bold text-black">{invoice.customers?.name || 'غير محدد'}</div>
                <div className="text-xs text-gray-500">{companyInfo.address || "المملكة العربية السعودية"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Date / التاريخ</div>
                <div className="font-bold text-black">{invoice.issue_date}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Due date / تاريخ الاستحقاق</div>
                <div className="font-bold text-black">{invoice.due_date}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">VAT number / الرقم الضريبي</div>
                <div className="font-bold text-black">{companyInfo.vatNumber || "301201976300003"}</div>
              </div>
            </div>

            {/* Total Due Box */}
            <div className="bg-gray-100 p-4 text-center border-b">
              <div className="text-sm text-gray-500">Total due (VAT Inclusive) / المبلغ المستحق (شامل الضريبة)</div>
              <div className="text-3xl font-bold text-black">
                SAR {invoice.total_amount?.toFixed(2)}
              </div>
            </div>

            {/* Items Table - Gray Header */}
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-500 text-white">
                  <th className="p-3 text-center border border-gray-500">Item</th>
                  <th className="p-3 text-center border border-gray-500">Description / الوصف</th>
                  <th className="p-3 text-center border border-gray-500">Quantity / الكمية</th>
                  <th className="p-3 text-center border border-gray-500">Price / السعر</th>
                  <th className="p-3 text-center border border-gray-500">Amount / المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {items && items.length > 0 ? (
                  items.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="p-3 text-center border text-black">{index + 1}</td>
                      <td className="p-3 text-right border text-black">{item.item_name}</td>
                      <td className="p-3 text-center border text-black">{item.quantity}</td>
                      <td className="p-3 text-center border text-black">{item.unit_price?.toFixed(2)}</td>
                      <td className="p-3 text-center border text-black">{(item.total_amount || item.quantity * item.unit_price)?.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="bg-white">
                    <td className="p-3 text-center border text-black">1</td>
                    <td className="p-3 text-right border text-black">خدمات عامة</td>
                    <td className="p-3 text-center border text-black">1</td>
                    <td className="p-3 text-center border text-black">{invoice.amount?.toFixed(2)}</td>
                    <td className="p-3 text-center border text-black">{invoice.amount?.toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Summary */}
            <div className="flex justify-end p-4">
              <div className="w-72">
                <div className="flex justify-between py-2 border-t-2 border-gray-800 font-bold text-lg text-black">
                  <span>الإجمالي (شامل الضريبة):</span>
                  <span>SAR {invoice.total_amount?.toFixed(2)}</span>
                </div>
                <div className="mt-2 text-sm text-gray-700 text-center bg-gray-100 p-2 rounded">
                  <strong>المبلغ كتابة:</strong> {numberToArabicWords(invoice.total_amount || 0)}
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="bg-gray-50 p-5 text-center border-t">
              <div className="mb-4">
                <QRCodeSVG 
                  value={generateVerificationUrl()}
                  size={150}
                  className="mx-auto"
                />
              </div>
              <p className="text-sm text-gray-800 font-medium mb-2">يمكنك التحقق من صحة الفاتورة بمسح رمز QR</p>
              <p className="text-sm text-gray-600">هذه فاتورة إلكترونية ولا تحتاج إلى ختم</p>
            </div>

            {/* Footer */}
            <div className="text-center p-2 text-sm text-gray-600 border-t">
              <p>{companyInfo.name || "وكالة إبداع واحتراف للدعاية والإعلان"}</p>
              <p>Page 1 of 1 - {invoice.invoice_number}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoicePreview;