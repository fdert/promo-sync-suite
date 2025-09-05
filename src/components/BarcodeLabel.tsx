import React, { useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeLabelProps {
  orderNumber: string;
  customerName: string;
  phoneNumber: string;
  paymentStatus: string;
  orderId: string;
}

export const BarcodeLabel: React.FC<BarcodeLabelProps> = ({
  orderNumber,
  customerName,
  phoneNumber,
  paymentStatus,
  orderId
}) => {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, orderNumber, {
        format: "CODE128",
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 14,
        textMargin: 8,
        margin: 10
      });
    }
  }, [orderNumber]);

  const getPaymentStatusColor = (status: string) => {
    const totalAmount = parseFloat(status.split('|')[1] || '0');
    const paidAmount = parseFloat(status.split('|')[2] || '0');
    
    if (paidAmount >= totalAmount) return 'text-success';
    if (paidAmount > 0) return 'text-warning';
    return 'text-destructive';
  };

  const formatPaymentStatus = (status: string) => {
    const parts = status.split('|');
    if (parts.length === 3) {
      const totalAmount = parseFloat(parts[1]);
      const paidAmount = parseFloat(parts[2]);
      const remaining = totalAmount - paidAmount;
      
      if (paidAmount >= totalAmount) return 'مدفوع بالكامل';
      if (paidAmount > 0) return `متبقي: ${remaining.toFixed(2)} ر.س`;
      return `غير مدفوع: ${totalAmount.toFixed(2)} ر.س`;
    }
    return status;
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-background border border-border rounded-lg p-4 print:shadow-none print:border-black">
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body { margin: 0; }
            .print\\:shadow-none { box-shadow: none !important; }
            .print\\:border-black { border-color: #000 !important; }
            @page { 
              size: 100mm 150mm; /* مقاس ملصق الباركود 10×15 سم */
              margin: 0;
            }
          }
        `
      }} />
      
      {/* Header */}
      <div className="text-center mb-4 border-b border-border pb-2">
        <h3 className="text-lg font-bold text-foreground">وكالة الابداع والاحتراف للدعاية والاعلان</h3>
        <p className="text-sm text-muted-foreground">ملصق طلب - {new Date().toLocaleDateString('ar-SA')}</p>
      </div>

      {/* Order Info */}
      <div className="space-y-2 mb-4 text-sm">
        <div className="flex justify-between">
          <span className="font-medium text-foreground">رقم الطلب:</span>
          <span className="text-foreground">{orderNumber}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-medium text-foreground">العميل:</span>
          <span className="text-foreground truncate max-w-[150px]" title={customerName}>{customerName}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-medium text-foreground">الجوال:</span>
          <span className="text-foreground">{phoneNumber}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-medium text-foreground">حالة الدفع:</span>
          <span className={`font-medium ${getPaymentStatusColor(paymentStatus)}`}>
            {formatPaymentStatus(paymentStatus)}
          </span>
        </div>
      </div>

      {/* Barcode */}
      <div className="text-center border border-border rounded p-2 bg-background">
        <svg ref={barcodeRef} className="mx-auto"></svg>
      </div>

      {/* Footer */}
      <div className="text-center mt-4 pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">ID: {orderId.slice(-8)}</p>
      </div>
    </div>
  );
};