import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PrintOptions {
  paperSize?: 'thermal-80mm' | 'thermal-58mm' | 'a4' | 'barcode-15x10cm';
  margins?: string;
  settings?: any; // إعدادات الملصق من قاعدة البيانات
}

export const useThermalPrint = () => {
  const printBarcodeLabel = useCallback(async (
    orderNumber: string,
    customerName: string,
    phoneNumber: string,
    paymentStatus: string,
    orderId: string,
    options: PrintOptions = {}
  ) => {
    const { paperSize = 'barcode-15x10cm', margins = '2mm', settings } = options;
    
    // جلب معلومات الشركة الحقيقية من قاعدة البيانات
    let companyInfo = {
      name: 'وكالة الإبداع للدعاية والإعلان',
      logo: null,
      phone: null,
      address: null
    };

    try {
      // جلب من website_settings أولاً
      const { data: websiteData } = await supabase
        .from('website_settings')
        .select('setting_value')
        .eq('setting_key', 'website_content')
        .single();

      if (websiteData?.setting_value) {
        const websiteContent = websiteData.setting_value as any;
        if (websiteContent.companyInfo) {
          companyInfo.name = websiteContent.companyInfo.name || companyInfo.name;
          companyInfo.logo = websiteContent.companyInfo.logo || companyInfo.logo;
        }
        if (websiteContent.contactInfo) {
          companyInfo.phone = websiteContent.contactInfo.phone || companyInfo.phone;
          companyInfo.address = websiteContent.contactInfo.address || companyInfo.address;
        }
      }

      // جلب من barcode_label_settings إذا كانت متاحة
      const { data: labelSettings } = await supabase
        .from('barcode_label_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      if (labelSettings) {
        companyInfo.name = labelSettings.company_name || companyInfo.name;
        companyInfo.logo = labelSettings.company_logo_url || companyInfo.logo;
        companyInfo.phone = labelSettings.company_phone || companyInfo.phone;
        companyInfo.address = labelSettings.company_address || companyInfo.address;
      }
    } catch (error) {
      console.log('Using default company info');
    }
    
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
                     paperSize === 'thermal-58mm' ? '58mm auto' :
                     paperSize === 'barcode-15x10cm' ? '150mm 100mm' : 'A4';

    const labelWidth = paperSize === 'thermal-80mm' ? '76mm' : 
                       paperSize === 'thermal-58mm' ? '54mm' :
                       paperSize === 'barcode-15x10cm' ? '146mm' : '200mm';

    // استخدام الإعدادات من قاعدة البيانات إذا كانت متوفرة
    const finalSettings = settings || {
      label_width: paperSize === 'thermal-80mm' ? 80 : 
                   paperSize === 'thermal-58mm' ? 58 : 
                   paperSize === 'barcode-15x10cm' ? 146 : 200,
      margins: 2,
      barcode_height: paperSize === 'barcode-15x10cm' ? 80 : 50,
      barcode_width: paperSize === 'barcode-15x10cm' ? 3 : 2,
      font_size: paperSize === 'barcode-15x10cm' ? 16 : 12,
      show_company_logo: true,
      show_company_name: true,
      show_date: true,
      company_name: companyInfo.name,
      company_logo_url: companyInfo.logo
    };

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
            margin: ${finalSettings.margins || 2}mm;
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
            width: ${finalSettings.label_width || 76}mm;
            max-width: ${finalSettings.label_width || 76}mm;
            margin: 0 auto;
            padding: ${finalSettings.margins || 2}mm;
            border: 2px solid #000;
            background: white;
            font-size: ${finalSettings.font_size || 12}pt;
            line-height: 1.3;
            box-sizing: border-box;
          }
          
          .header {
            text-align: center;
            margin-bottom: 4mm;
            padding-bottom: 2mm;
            border-bottom: 1px solid #000;
          }
          
          .company-logo {
            max-width: 40mm;
            max-height: 15mm;
            margin: 0 auto 2mm auto;
            display: block;
          }
          
          .company-name {
            font-size: ${(finalSettings.font_size || 12) + 2}pt;
            font-weight: bold;
            margin-bottom: 1mm;
          }
          
          .date {
            font-size: ${(finalSettings.font_size || 12) - 2}pt;
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
            font-size: ${(finalSettings.font_size || 12) - 1}pt;
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
            font-size: ${(finalSettings.font_size || 12) - 4}pt;
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
            ${finalSettings.show_company_logo && (finalSettings.company_logo_url || companyInfo.logo) ? 
              `<img src="${finalSettings.company_logo_url || companyInfo.logo}" alt="شعار الشركة" class="company-logo">` : ''
            }
            ${finalSettings.show_company_name ? 
              `<div class="company-name">${finalSettings.company_name || companyInfo.name}</div>` : ''
            }
            ${finalSettings.show_date ? 
              `<div class="date">ملصق طلب - ${new Date().toLocaleDateString('ar-SA')}</div>` : ''
            }
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
            ${companyInfo.phone ? `<div class="text-xs">هاتف: ${companyInfo.phone}</div>` : ''}
          </div>
        </div>
        
        <script>
          function generateBarcode() {
            try {
              JsBarcode("#barcode", "${orderNumber}", {
                format: "CODE128",
                width: ${finalSettings.barcode_width || 2},
                height: ${finalSettings.barcode_height || 50},
                displayValue: true,
                fontSize: ${(finalSettings.font_size || 12) - 2},
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