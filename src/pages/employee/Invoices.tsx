// @ts-nocheck
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Printer, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import InvoicePrint from "@/components/InvoicePrint";
import InvoicePreview from "@/components/InvoicePreview";
import { useRealtimeData } from "@/hooks/useRealtimeData";

const Invoices = () => {
  const { data: invoicesBase, loading: invoicesLoading, refetch } = useRealtimeData('invoices', [], { column: 'created_at', ascending: false });
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [printingInvoice, setPrintingInvoice] = useState(null);
  const [companyInfo, setCompanyInfo] = useState({
    name: "وكالة الإبداع للدعاية والإعلان",
    address: "المملكة العربية السعودية",
    phone: "+966535983261",
    email: "info@alibdaa.com",
    logo: "",
    stamp: "",
    tagline: "نبني الأحلام بالإبداع والتميز"
  });
  const { toast } = useToast();

  // جلب بيانات الشركة من إعدادات الموقع
  const fetchCompanyInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('website_settings')
        .select('setting_value')
        .eq('setting_key', 'website_content')
        .maybeSingle();
      
      if (!error && data?.setting_value) {
        const websiteData = data.setting_value as any;
        const companyData = websiteData.companyInfo;
        const contactData = websiteData.contactInfo;
        
        if (companyData) {
          const newCompanyInfo = {
            name: companyData.name || "وكالة الإبداع للدعاية والإعلان",
            address: contactData?.address || "المملكة العربية السعودية",
            phone: contactData?.phone || "+966535983261",
            email: contactData?.email || "info@alibdaa.com",
            logo: companyData.logo || "",
            stamp: companyData.stamp || "",
            tagline: companyData.tagline || "نبني الأحلام بالإبداع والتميز"
          };
          
          setCompanyInfo(newCompanyInfo);
        }
      }
    } catch (error) {
      console.error('Error fetching company info:', error);
    }
  };

  // تحديث بيانات الفواتير مع المدفوعات
  const updateInvoicesWithPayments = async (baseInvoices: any[]) => {
    setLoading(true);
    try {
      // حساب المدفوعات لكل فاتورة
      const invoicesWithPayments = await Promise.all(
        baseInvoices.map(async (invoice) => {
          // جلب تفاصيل العميل
          const { data: invoiceWithCustomer } = await supabase
            .from('invoices')
            .select(`
              *,
              customers (
                id,
                name,
                phone,
                address
              )
            `)
            .eq('id', invoice.id)
            .single();

          // جلب المدفوعات المرتبطة بالفاتورة مباشرة
          const { data: directPayments } = await supabase
            .from('payments')
            .select('amount, payment_type, payment_date')
            .eq('invoice_id', invoice.id);

          // جلب المدفوعات المرتبطة بالطلب إذا كانت الفاتورة مرتبطة بطلب
          let orderPayments = [];
          if (invoice.order_id) {
            const { data: orderPaymentsData } = await supabase
              .from('payments')
              .select('amount, payment_type, payment_date')
              .eq('order_id', invoice.order_id);
            orderPayments = orderPaymentsData || [];
          }

          // دمج المدفوعات
          const allPayments = [...(directPayments || []), ...orderPayments];
          const totalPaid = allPayments.reduce((sum, payment) => sum + payment.amount, 0);
          const remainingAmount = invoice.total_amount - totalPaid;

          // تحديد حالة الدفع
          let paymentStatus;
          if (totalPaid >= invoice.total_amount) {
            paymentStatus = 'مدفوعة';
          } else if (totalPaid > 0) {
            paymentStatus = 'مدفوعة جزئياً';
          } else {
            paymentStatus = 'قيد الانتظار';
          }

          return {
            ...(invoiceWithCustomer || invoice),
            total_paid: totalPaid,
            remaining_amount: remainingAmount,
            payment_status: paymentStatus,
            payment_details: allPayments
          };
        })
      );

      setInvoices(invoicesWithPayments);
    } catch (error) {
      console.error('Error updating invoices with payments:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحديث بيانات الفواتير",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // مراقبة تغييرات البيانات الأساسية
  useEffect(() => {
    if (invoicesBase.length > 0) {
      updateInvoicesWithPayments(invoicesBase);
    } else {
      setInvoices([]);
      setLoading(invoicesLoading);
    }
  }, [invoicesBase, invoicesLoading]);

  // دالة معاينة الفاتورة
  const handleViewInvoice = async (invoice) => {
    const { data: invoiceItems, error } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id);

    if (error) {
      console.error('Error fetching invoice items:', error);
    }

    const updatedInvoice = {
      ...invoice,
      items: invoiceItems || [],
      actual_status: invoice.payment_status,
      actual_payment_type: invoice.payment_type
    };

    setViewingInvoice(updatedInvoice);
  };

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

  // دالة توليد QR Code كـ Data URL
  const generateQRCodeDataUrl = async (data: string): Promise<string> => {
    try {
      const QRCode = await import('qrcode');
      return await QRCode.toDataURL(data, {
        width: 150,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      return '';
    }
  };

  // دالة طباعة الفاتورة
  const handlePrintInvoice = async (invoice) => {
    const { data: invoiceItems, error } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id);

    if (error) {
      console.error('Error fetching invoice items:', error);
    }

    const items = invoiceItems || [];
    
    // Generate QR Code
    const verificationUrl = `${window.location.origin}/verify/${invoice.id}`;
    const qrCodeDataUrl = await generateQRCodeDataUrl(verificationUrl);
    const totalInWords = numberToArabicWords(invoice.total_amount || 0);

    const itemsHtml = items.length > 0 
      ? items.map((item, index) => `
        <tr style="background: ${index % 2 === 0 ? '#ffffff' : '#f5f5f5'};">
          <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">${index + 1}</td>
          <td style="padding: 12px; text-align: right; border: 1px solid #ddd;">${item.item_name}</td>
          <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">${item.quantity}</td>
          <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">${item.unit_price?.toFixed(2)}</td>
          <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">${(item.total || item.quantity * item.unit_price)?.toFixed(2)}</td>
        </tr>
      `).join('')
      : `
        <tr style="background: #ffffff;">
          <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">1</td>
          <td style="padding: 12px; text-align: right; border: 1px solid #ddd;">خدمات عامة</td>
          <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">1</td>
          <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">${(invoice.total_amount / 1.15)?.toFixed(2)}</td>
          <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">${(invoice.total_amount / 1.15)?.toFixed(2)}</td>
        </tr>
      `;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة ضريبية مبسطة - ${invoice.invoice_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 20px; direction: rtl; background: #fff; color: #000; }
          @media print {
            body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div style="max-width: 800px; margin: 0 auto;">
          <!-- Header -->
          <div style="background: #ffffff; color: #000; padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333;">
            <div style="text-align: right;">
              <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 5px; color: #000;">${companyInfo.name || "وكالة إبداع واحتراف للدعاية والإعلان"}</h3>
              <p style="font-size: 12px; color: #666;">للدعاية والإعلان</p>
            </div>
            <div style="text-align: center;">
              <h1 style="font-size: 20px; font-weight: bold; color: #000;">فاتورة ضريبية مبسطة</h1>
              <h2 style="font-size: 14px; color: #666;">Simplified Tax Invoice</h2>
            </div>
            ${companyInfo.logo ? `<img src="${companyInfo.logo}" alt="Logo" style="height: 60px; width: 60px; object-fit: contain;" />` : '<div style="width: 60px;"></div>'}
          </div>

          <!-- Invoice Details -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 15px; border-bottom: 1px solid #ddd;">
            <div>
              <div style="font-size: 10px; color: #666;">Invoice number / رقم الفاتورة</div>
              <div style="font-size: 14px; font-weight: bold; color: #000;">${invoice.invoice_number}</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #666;">Bill to / الفاتورة إلى</div>
              <div style="font-size: 14px; font-weight: bold; color: #000;">${invoice.customers?.name || 'غير محدد'}</div>
              <div style="font-size: 10px; color: #666;">المملكة العربية السعودية</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #666;">Date / التاريخ</div>
              <div style="font-size: 14px; font-weight: bold; color: #000;">${invoice.issue_date}</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #666;">Due date / تاريخ الاستحقاق</div>
              <div style="font-size: 14px; font-weight: bold; color: #000;">${invoice.due_date || '-'}</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #666;">VAT number / الرقم الضريبي</div>
              <div style="font-size: 14px; font-weight: bold; color: #000;">301201976300003</div>
            </div>
          </div>

          <!-- Total Due Box -->
          <div style="background: #f5f5f5; padding: 15px; text-align: center; border-bottom: 1px solid #ddd;">
            <div style="font-size: 12px; color: #666;">Total due (VAT Inclusive) / المبلغ المستحق (شامل الضريبة)</div>
            <div style="font-size: 28px; font-weight: bold; color: #000;">SAR ${invoice.total_amount?.toFixed(2)}</div>
          </div>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #6b7280; color: white;">
                <th style="padding: 12px; text-align: center; border: 1px solid #6b7280;">Item</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #6b7280;">Description / الوصف</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #6b7280;">Quantity / الكمية</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #6b7280;">Price / السعر</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #6b7280;">Amount / المبلغ</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Summary -->
          <div style="display: flex; justify-content: flex-end; padding: 15px;">
            <div style="width: 300px;">
              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid #333; font-weight: bold; font-size: 16px; color: #000;">
                <span>الإجمالي (شامل الضريبة):</span>
                <span>SAR ${invoice.total_amount?.toFixed(2)}</span>
              </div>
              <div style="padding: 10px 0; font-size: 12px; color: #333; text-align: center; background: #f9f9f9; border-radius: 5px; margin-top: 5px;">
                <strong>المبلغ كتابة:</strong> ${totalInWords}
              </div>
            </div>
          </div>

          <!-- QR Code Section -->
          <div style="background: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
            <div style="margin-bottom: 15px;">
              <img src="${qrCodeDataUrl}" alt="QR Code" style="width: 150px; height: 150px;" />
            </div>
            <p style="font-size: 12px; color: #333; font-weight: 500; margin-bottom: 8px;">يمكنك التحقق من صحة الفاتورة بمسح رمز QR</p>
            <p style="font-size: 11px; color: #666; line-height: 1.6;">هذه فاتورة إلكترونية ولا تحتاج إلى ختم</p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding: 10px; font-size: 12px; color: #666; border-top: 1px solid #ddd;">
            <p>${companyInfo.name || "وكالة إبداع واحتراف للدعاية والإعلان"}</p>
            <p>Page 1 of 1 - ${invoice.invoice_number}</p>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);

    updatePrintCount(invoice.id);
  };

  // دالة تحديث عدد مرات الطباعة
  const updatePrintCount = async (invoiceId) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ 
          print_count: 1, // سيتم تحديث عداد الطباعة
          last_printed_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      if (error) {
        console.error('Error updating print count:', error);
      }
    } catch (error) {
      console.error('Error updating print count:', error);
    }
  };

  // تصفية الفواتير
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || invoice.payment_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // دالة الحصول على لون الحالة
  const getStatusColor = (status) => {
    switch (status) {
      case 'مدفوعة':
        return 'bg-green-100 text-green-800';
      case 'مدفوعة جزئياً':
        return 'bg-blue-100 text-blue-800';
      case 'قيد الانتظار':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // دالة الحصول على نمط شارة الحالة
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'مدفوعة':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
      case 'مدفوعة جزئياً':
        return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300';
      case 'قيد الانتظار':
        return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300';
    }
  };

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg">جاري تحميل الفواتير...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">إدارة الفواتير</h1>
          <p className="text-muted-foreground">عرض ومعاينة الفواتير</p>
        </div>
      </div>

      {/* البحث والفلاتر */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            البحث والفلاتر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Input
                placeholder="البحث برقم الفاتورة أو اسم العميل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="فلترة حسب الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="مدفوعة">مدفوعة</SelectItem>
                  <SelectItem value="مدفوعة جزئياً">مدفوعة جزئياً</SelectItem>
                  <SelectItem value="قيد الانتظار">قيد الانتظار</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">
                {filteredInvoices.length} من {invoices.length} فاتورة
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* جدول الفواتير */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              📋
            </div>
            قائمة الفواتير
          </CardTitle>
          <CardDescription className="text-base">
            جميع الفواتير مع تفاصيل المدفوعات والحالة
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-background">
              <thead>
                <tr className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border">
                  <th className="p-4 text-right font-semibold text-foreground border-r border-border min-w-[140px]">
                    رقم الفاتورة
                  </th>
                  <th className="p-4 text-right font-semibold text-foreground border-r border-border min-w-[180px]">
                    العميل
                  </th>
                  <th className="p-4 text-center font-semibold text-foreground border-r border-border min-w-[120px]">
                    تاريخ الإصدار
                  </th>
                  <th className="p-4 text-center font-semibold text-foreground border-r border-border min-w-[130px]">
                    المبلغ الإجمالي
                  </th>
                  <th className="p-4 text-center font-semibold text-foreground border-r border-border min-w-[120px]">
                    المدفوع
                  </th>
                  <th className="p-4 text-center font-semibold text-foreground border-r border-border min-w-[120px]">
                    المتبقي
                  </th>
                  <th className="p-4 text-center font-semibold text-foreground border-r border-border min-w-[120px]">
                    الحالة
                  </th>
                  <th className="p-4 text-center font-semibold text-foreground min-w-[140px]">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice, index) => (
                  <tr 
                    key={invoice.id} 
                    className={`
                      border-b border-border/50 transition-all duration-200 hover:bg-muted/30
                      ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}
                    `}
                  >
                    <td className="p-4 border-r border-border/50">
                      <div className="font-mono text-sm bg-secondary/20 px-2 py-1 rounded inline-block">
                        {invoice.invoice_number}
                      </div>
                    </td>
                    <td className="p-4 border-r border-border/50">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-foreground">
                          {invoice.customers?.name || 'غير محدد'}
                        </span>
                        {invoice.customers?.phone && (
                          <span className="text-xs text-muted-foreground">
                            {invoice.customers.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center border-r border-border/50">
                      <div className="text-sm">
                        {new Date(invoice.issue_date).toLocaleDateString('ar-SA')}
                      </div>
                    </td>
                    <td className="p-4 text-center border-r border-border/50">
                      <div className="font-bold text-base text-foreground">
                        {invoice.total_amount?.toLocaleString('ar-SA')} 
                        <span className="text-xs text-muted-foreground mr-1">ر.س</span>
                      </div>
                    </td>
                    <td className="p-4 text-center border-r border-border/50">
                      <div className="font-bold text-sm">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {invoice.total_paid?.toLocaleString('ar-SA')}
                        </span>
                        <span className="text-xs text-muted-foreground mr-1">ر.س</span>
                      </div>
                    </td>
                    <td className="p-4 text-center border-r border-border/50">
                      <div className="font-bold text-sm">
                        <span className={`${
                          invoice.remaining_amount > 0 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {invoice.remaining_amount?.toLocaleString('ar-SA')}
                        </span>
                        <span className="text-xs text-muted-foreground mr-1">ر.س</span>
                      </div>
                    </td>
                    <td className="p-4 text-center border-r border-border/50">
                      <Badge 
                        variant="outline"
                        className={`px-3 py-1 text-xs font-medium border-2 ${getStatusBadgeStyle(invoice.payment_status)}`}
                      >
                        {invoice.payment_status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 hover:bg-primary/10 hover:border-primary"
                          onClick={() => handleViewInvoice(invoice)}
                          title="معاينة الفاتورة"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 hover:bg-secondary/50 hover:border-secondary"
                          onClick={() => {
                            handlePrintInvoice(invoice);
                            updatePrintCount(invoice.id);
                          }}
                          title="طباعة الفاتورة"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredInvoices.length === 0 && (
            <div className="text-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="text-6xl opacity-20">📄</div>
                <div>
                  <p className="text-lg font-medium text-muted-foreground">لم يتم العثور على فواتير</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">جرب تغيير معايير البحث أو الفلاتر</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* مكون المعاينة */}
      {viewingInvoice && (
        <InvoicePreview
          isOpen={!!viewingInvoice}
          onClose={() => setViewingInvoice(null)}
          invoice={viewingInvoice}
          items={viewingInvoice.items || []}
          companyInfo={companyInfo}
          onPrint={() => {
            handlePrintInvoice(viewingInvoice);
            updatePrintCount(viewingInvoice.id);
          }}
        />
      )}

      {/* مكون الطباعة */}
      {printingInvoice && (
        <InvoicePrint
          invoice={printingInvoice}
          items={printingInvoice.items || []}
          companyInfo={companyInfo}
        />
      )}
    </div>
  );
};

export default Invoices;