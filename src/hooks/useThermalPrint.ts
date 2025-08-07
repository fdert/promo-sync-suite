import { useCallback } from 'react';

interface PrintOptions {
  paperSize?: 'thermal-80mm' | 'thermal-58mm' | 'a4';
  margins?: string;
}

export const useThermalPrint = () => {
  const printBarcodeLabel = useCallback((
    orderNumber: string,
    customerName: string,
    phoneNumber: string,
    paymentStatus: string,
    orderId: string,
    options: PrintOptions = {}
  ) => {
    const { paperSize = 'thermal-80mm', margins = '2mm' } = options;
    
    // إنشاء نافذة طباعة منفصلة
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    
    if (!printWindow) {
      alert('يرجى السماح بفتح النوافذ المنبثقة للطباعة');
      return;
    }

    // تحديد حالة الدفع
    const getPaymentStatusColor = (status: string) => {
      const parts = status.split('|');
      if (parts.length === 3) {
        const totalAmount = parseFloat(parts[1]);
        const paidAmount = parseFloat(parts[2]);
        
        if (paidAmount >= totalAmount) return '#22c55e'; // أخضر
        if (paidAmount > 0) return '#f59e0b'; // أصفر
        return '#ef4444'; // أحمر
      }
      return '#000';
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

    const pageSize = paperSize === 'thermal-80mm' ? '80mm auto' : 
                     paperSize === 'thermal-58mm' ? '58mm auto' : 'A4';

    const labelWidth = paperSize === 'thermal-80mm' ? '76mm' : 
                       paperSize === 'thermal-58mm' ? '54mm' : '200mm';

    // محتوى HTML للطباعة
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ملصق باركود - ${orderNumber}</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: 'Arial', sans-serif;
            background: white;
            color: #000;
            direction: rtl;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          @page {
            size: ${pageSize};
            margin: ${margins};
          }
          
          @media print {
            body { 
              margin: 0;
              padding: 0;
            }
            .no-print { 
              display: none !important; 
            }
          }
          
          .label-container {
            width: ${labelWidth};
            max-width: ${labelWidth};
            margin: 0 auto;
            padding: 4mm;
            border: 2px solid #000;
            background: white;
            font-size: 12pt;
            line-height: 1.3;
            box-sizing: border-box;
          }
          
          .header {
            text-align: center;
            margin-bottom: 4mm;
            padding-bottom: 2mm;
            border-bottom: 1px solid #000;
          }
          
          .company-name {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 1mm;
          }
          
          .date {
            font-size: 10pt;
            color: #333;
          }
          
          .info-section {
            margin-bottom: 4mm;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1mm;
            padding: 1mm 0;
            border-bottom: 1px dotted #ccc;
            font-size: 11pt;
          }
          
          .info-row:last-child {
            border-bottom: none;
          }
          
          .label {
            font-weight: bold;
          }
          
          .value {
            max-width: 60%;
            text-align: left;
            word-wrap: break-word;
          }
          
          .payment-status {
            color: ${getPaymentStatusColor(paymentStatus)};
            font-weight: bold;
          }
          
          .barcode-section {
            text-align: center;
            margin: 4mm 0;
            padding: 2mm;
            border: 1px solid #000;
            background: white;
          }
          
          .barcode-section svg {
            width: 100%;
            height: auto;
            max-width: 100%;
          }
          
          .footer {
            text-align: center;
            margin-top: 2mm;
            padding-top: 2mm;
            border-top: 1px solid #000;
            font-size: 8pt;
            color: #666;
          }
          
          .print-button {
            display: block;
            margin: 10px auto;
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
          }
          
          .print-button:hover {
            background: #0056b3;
          }
        </style>
      </head>
      <body>
        <button onclick="printLabel()" class="print-button no-print">طباعة الملصق</button>
        
        <div class="label-container">
          <div class="header">
            <div class="company-name">وكالة الإبداع للدعاية والإعلان</div>
            <div class="date">ملصق طلب - ${new Date().toLocaleDateString('ar-SA')}</div>
          </div>
          
          <div class="info-section">
            <div class="info-row">
              <span class="label">رقم الطلب:</span>
              <span class="value">${orderNumber}</span>
            </div>
            
            <div class="info-row">
              <span class="label">العميل:</span>
              <span class="value" title="${customerName}">${customerName}</span>
            </div>
            
            <div class="info-row">
              <span class="label">الجوال:</span>
              <span class="value">${phoneNumber}</span>
            </div>
            
            <div class="info-row">
              <span class="label">حالة الدفع:</span>
              <span class="value payment-status">${formatPaymentStatus(paymentStatus)}</span>
            </div>
          </div>
          
          <div class="barcode-section">
            <svg id="barcode"></svg>
          </div>
          
          <div class="footer">
            <div>معرف الطلب: ${orderId.slice(-8)}</div>
          </div>
        </div>
        
        <script>
          function generateBarcode() {
            try {
              JsBarcode("#barcode", "${orderNumber}", {
                format: "CODE128",
                width: 2,
                height: 50,
                displayValue: true,
                fontSize: 12,
                textMargin: 5,
                margin: 5,
                background: "white",
                lineColor: "black"
              });
            } catch (error) {
              console.error('Error generating barcode:', error);
              document.getElementById('barcode').innerHTML = '<text y="25" text-anchor="middle" x="50%">${orderNumber}</text>';
            }
          }
          
          function printLabel() {
            window.print();
          }
          
          // إنشاء الباركود عند تحميل الصفحة
          window.onload = function() {
            generateBarcode();
          };
        </script>
      </body>
      </html>
    `;

    // كتابة المحتوى في النافذة الجديدة
    printWindow.document.write(printContent);
    printWindow.document.close();

    // التركيز على النافذة الجديدة
    printWindow.focus();

  }, []);

  return { printBarcodeLabel };
};