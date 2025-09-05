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
                     paperSize === 'barcode-15x10cm' ? '100mm 150mm' : 'A4';

    const labelWidth = paperSize === 'thermal-80mm' ? '76mm' : 
                       paperSize === 'thermal-58mm' ? '54mm' :
                       paperSize === 'barcode-15x10cm' ? '96mm' : '200mm';

    // استخدام الإعدادات من قاعدة البيانات إذا كانت متوفرة
    const finalSettings = settings || {
      label_width: paperSize === 'thermal-80mm' ? 80 : 
                   paperSize === 'thermal-58mm' ? 58 : 
                   paperSize === 'barcode-15x10cm' ? 96 : 200,
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

    // محتوى HTML للطباعة محسن لطابعة ZDesigner GX420t
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>ملصق باركود - ${orderNumber}</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            width: 100mm;
            height: 150mm;
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background: white;
            color: black;
            font-size: 8pt;
            overflow: hidden;
          }
          
          @page {
            size: 100mm 150mm;
            margin: 0;
          }
          
          @media print {
            body { 
              margin: 0 !important;
              padding: 0 !important;
              width: 100mm !important;
              height: 150mm !important;
              overflow: hidden !important;
            }
            .no-print { 
              display: none !important; 
            }
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }
          
          .label-wrapper {
            width: 100mm;
            height: 150mm;
            padding: 3mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
          }
          
          .header {
            text-align: center;
            border-bottom: 1px solid black;
            padding-bottom: 2mm;
            margin-bottom: 2mm;
          }
          
          .company-name {
            font-size: 10pt;
            font-weight: bold;
            margin-bottom: 1mm;
            line-height: 1.1;
          }
          
          .date {
            font-size: 7pt;
            color: #333;
          }
          
          .info-section {
            flex: 1;
            margin-bottom: 2mm;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1mm;
            font-size: 8pt;
            line-height: 1.2;
            border-bottom: 1px dotted #ccc;
            padding-bottom: 0.5mm;
          }
          
          .label {
            font-weight: bold;
            white-space: nowrap;
          }
          
          .value {
            text-align: left;
            max-width: 50mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          
          .payment-status {
            color: ${getPaymentStatusColor(paymentStatus)};
            font-weight: bold;
          }
          
          .barcode-container {
            text-align: center;
            margin: 2mm 0;
            height: 40mm;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid black;
            background: white;
          }
          
          .barcode-container svg {
            max-width: 90mm;
            max-height: 35mm;
          }
          
          .footer {
            text-align: center;
            border-top: 1px solid black;
            padding-top: 1mm;
            font-size: 6pt;
            color: #666;
          }
          
          .print-btn {
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 8px 16px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            z-index: 1000;
          }
        </style>
      </head>
      <body>
        <button onclick="window.print()" class="print-btn no-print">طباعة</button>
        
        <div class="label-wrapper">
          <div class="header">
            <div class="company-name">${finalSettings.company_name || companyInfo.name}</div>
            <div class="date">ملصق طلب - ${new Date().toLocaleDateString('ar-SA')}</div>
          </div>
          
          <div class="info-section">
            <div class="info-row">
              <span class="label">رقم الطلب:</span>
              <span class="value">${orderNumber}</span>
            </div>
            
            <div class="info-row">
              <span class="label">العميل:</span>
              <span class="value" title="${customerName}">${customerName.substring(0, 20)}${customerName.length > 20 ? '...' : ''}</span>
            </div>
            
            <div class="info-row">
              <span class="label">الجوال:</span>
              <span class="value">${phoneNumber}</span>
            </div>
            
            <div class="info-row">
              <span class="label">حالة الدفع:</span>
              <span class="value payment-status">${formatPaymentStatus(paymentStatus).substring(0, 15)}${formatPaymentStatus(paymentStatus).length > 15 ? '...' : ''}</span>
            </div>
          </div>
          
          <div class="barcode-container">
            <svg id="barcode"></svg>
          </div>
          
          <div class="footer">
            <div>ID: ${orderId.slice(-8)}</div>
            ${companyInfo.phone ? `<div>هاتف: ${companyInfo.phone}</div>` : ''}
          </div>
        </div>
        
        <script>
          function generateBarcode() {
            try {
              JsBarcode("#barcode", "${orderNumber}", {
                format: "CODE128",
                width: 1.5,
                height: 25,
                displayValue: true,
                fontSize: 10,
                textMargin: 2,
                margin: 2,
                background: "white",
                lineColor: "black"
              });
            } catch (error) {
              console.error('Error generating barcode:', error);
              document.getElementById('barcode').innerHTML = '<text y="15" text-anchor="middle" x="50%" font-size="12">${orderNumber}</text>';
            }
          }
          
          window.onload = function() {
            generateBarcode();
            // طباعة تلقائية بعد تحميل الصفحة
            setTimeout(function() {
              window.print();
            }, 1000);
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