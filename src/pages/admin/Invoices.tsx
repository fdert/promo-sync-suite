// @ts-nocheck
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, Eye, Printer, MessageCircle, Calendar, Filter, Trash2, X, Edit2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import InvoicePrint from "@/components/InvoicePrint";
import InvoicePreview from "@/components/InvoicePreview";

// خرائط تحويل حالة الفاتورة بين العربية و enum قاعدة البيانات
const mapStatusToEnum = (status?: string) => {
  const m: Record<string, 'draft' | 'sent' | 'paid' | 'cancelled'> = {
    'مسودة': 'draft',
    'مرسلة': 'sent',
    'قيد الانتظار': 'sent',
    'مدفوعة': 'paid',
    'مدفوع': 'paid',
    'ملغاة': 'cancelled',
  };
  return m[status || ''] || 'sent';
};

const mapEnumToArabic = (status?: 'draft' | 'sent' | 'paid' | 'cancelled') => {
  const m: Record<'draft' | 'sent' | 'paid' | 'cancelled', string> = {
    draft: 'مسودة',
    sent: 'قيد الانتظار',
    paid: 'مدفوعة',
    cancelled: 'ملغاة',
  };
  return status ? m[status] : 'قيد الانتظار';
};

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
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

  // دوال التحكم
  const handleViewInvoice = async (invoice) => {
    // جلب بنود الفاتورة
    const { data: invoiceItems, error } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id);

    if (error) {
      console.error('Error fetching invoice items:', error);
    }

    // جلب المدفوعات المرتبطة بالفاتورة
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoice.id);

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    }

    // حساب إجمالي المدفوعات والحالة الفعلية
    const totalPaid = paymentsData?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    const hasPayments = paymentsData && paymentsData.length > 0;
    
    // تحديد الحالة الفعلية
    let actualStatus;
    
    // إذا كانت الفاتورة محددة كـ "مدفوع" أو "مدفوعة" في قاعدة البيانات ولا توجد مدفوعات، استخدم الحالة الأصلية
    if ((invoice.status === 'مدفوع' || invoice.status === 'مدفوعة') && !hasPayments) {
      actualStatus = 'مدفوعة';
    } else {
      // حساب الحالة من المدفوعات الفعلية
      if (hasPayments) {
        if (totalPaid >= invoice.total_amount) {
          actualStatus = 'مدفوعة';
        } else if (totalPaid > 0) {
          actualStatus = 'مدفوعة جزئياً';
        } else {
          actualStatus = 'قيد الانتظار';
        }
      } else {
        actualStatus = 'قيد الانتظار';
      }
    }
    
    let actualPaymentType = 'دفع آجل';
    
    // استخدام نوع الدفع من آخر دفعة إذا وجدت
    if (hasPayments && paymentsData.length > 0) {
      const latestPayment = paymentsData.sort((a, b) => 
        new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      )[0];
      actualPaymentType = latestPayment.payment_type;
    }

    // تحديث الفاتورة مع البيانات الصحيحة
    const updatedInvoice = {
      ...invoice,
      items: invoiceItems || [],
      actual_status: actualStatus,
      actual_payment_type: actualPaymentType,
      total_paid: totalPaid,
      remaining_amount: invoice.total_amount - totalPaid
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

  const handlePrintInvoice = async (invoice) => {
    // جلب بنود الفاتورة
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

    toast({
      title: "تم إعداد الطباعة",
      description: `تم إعداد طباعة الفاتورة ${invoice.invoice_number}`,
    });
  };

  const handleEditInvoice = (invoice) => {
    // تحويل التواريخ إلى صيغة صحيحة
    const formattedInvoice = {
      ...invoice,
      issue_date: invoice.issue_date ? new Date(invoice.issue_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      due_date: invoice.due_date ? new Date(invoice.due_date).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: Number(invoice.total_amount || 0) / 1.15, // المبلغ قبل الضريبة
      tax: Number(invoice.tax) || 0,
      total_amount: Number(invoice.total_amount) || 0,
      paid_amount: Number(invoice.paid_amount) || 0
    };
    setEditingInvoice(formattedInvoice);
  };

  const handleAddInvoice = () => {
    // توليد رقم فاتورة جديد
    const invoiceNumber = `INV-${String(invoices.length + 1).padStart(3, '0')}`;
    
    // إعداد فاتورة جديدة
    const newInvoice = {
      invoice_number: invoiceNumber,
      customer_id: '',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: 0,
      tax: 0,
      total_amount: 0,
      status: 'قيد الانتظار',
      payment_type: 'دفع آجل',
      notes: ''
    };
    
    setEditingInvoice(newInvoice);
    setIsAddDialogOpen(false);
  };

  const saveInvoice = async (invoiceData) => {
    try {
      // التحقق من البيانات المطلوبة
      if (!invoiceData.customer_id) {
        toast({
          title: "خطأ",
          description: "يجب اختيار العميل",
          variant: "destructive",
        });
        return;
      }

      if (!invoiceData.subtotal || invoiceData.subtotal <= 0) {
        toast({
          title: "خطأ",
          description: "يجب إدخال مبلغ صحيح",
          variant: "destructive",
        });
        return;
      }

      // إعداد البيانات للحفظ
      const dataToSave = {
        invoice_number: invoiceData.invoice_number,
        customer_id: invoiceData.customer_id,
        issue_date: invoiceData.issue_date,
        due_date: invoiceData.due_date,
        tax: Number(invoiceData.tax || 0),
        discount: Number(invoiceData.discount || 0),
        total_amount: Number(invoiceData.total_amount),
        status: mapStatusToEnum(invoiceData.status),
        notes: invoiceData.notes || null,
        order_id: invoiceData.order_id || null
      };

      if (invoiceData.id) {
        // تحديث فاتورة موجودة
        const { error } = await supabase
          .from('invoices')
          .update(dataToSave)
          .eq('id', invoiceData.id);
        
        if (error) throw error;
        
        toast({
          title: "تم التحديث",
          description: "تم تحديث الفاتورة بنجاح",
        });
      } else {
        // إضافة فاتورة جديدة
        const { error } = await supabase
          .from('invoices')
          .insert([dataToSave]);
        
        if (error) throw error;
        
        toast({
          title: "تم الحفظ",
          description: "تم إنشاء الفاتورة بنجاح",
        });
      }
      
      await fetchInvoices();
      setEditingInvoice(null);
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء حفظ الفاتورة",
        variant: "destructive",
      });
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers:customer_id (
            id,
            name,
            phone,
            address
          )
        `)
        .order('created_at', { ascending: false });

      if (!error) {
        setInvoices(data || []);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (!error) {
        setCustomers(data || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchInvoices(), fetchCustomers(), fetchCompanyInfo()]);
      setLoading(false);
    };
    
    loadData();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6 screen-only">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة الفواتير</h1>
          <p className="text-muted-foreground">إنشاء ومتابعة الفواتير والمدفوعات</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة فاتورة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة فاتورة جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                هل تريد إنشاء فاتورة جديدة؟
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={handleAddInvoice}
                  className="flex-1"
                >
                  نعم، إنشاء فاتورة
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الفواتير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
            <p className="text-xs text-muted-foreground">إجمالي الفواتير المنشأة</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الفواتير المدفوعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices.filter(invoice => invoice.status === 'مدفوع').length}
            </div>
            <p className="text-xs text-muted-foreground">فواتير مدفوعة بالكامل</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد الانتظار</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices.filter(invoice => invoice.status === 'قيد الانتظار').length}
            </div>
            <p className="text-xs text-muted-foreground">في انتظار الدفع</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متأخرة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices.filter(invoice => invoice.status === 'متأخر').length}
            </div>
            <p className="text-xs text-muted-foreground">فواتير متأخرة الدفع</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
              <CardTitle>قائمة الفواتير</CardTitle>
              <CardDescription>
                إدارة ومتابعة جميع الفواتير والمدفوعات
              </CardDescription>
            </div>
            
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="البحث في الفواتير..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-64 pr-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="حالة الفاتورة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="قيد الانتظار">قيد الانتظار</SelectItem>
                  <SelectItem value="مدفوع">مدفوع</SelectItem>
                  <SelectItem value="متأخر">متأخر</SelectItem>
                  <SelectItem value="ملغي">ملغي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* قائمة الفواتير */}
          <div className="space-y-4">
            {invoices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">لا توجد فواتير حالياً</p>
                <p className="text-sm text-muted-foreground mt-2">
                  ابدأ بإنشاء فاتورة جديدة
                </p>
              </div>
            ) : (
              invoices
                .filter(invoice => {
                  const matchesSearch = searchTerm === "" || 
                    invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    invoice.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase());
                  
                  const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
                  
                  return matchesSearch && matchesStatus;
                })
                .map((invoice) => (
                  <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{invoice.invoice_number}</h3>
                            <Badge 
                              variant={
                                invoice.status === 'مدفوع' ? 'default' :
                                invoice.status === 'قيد الانتظار' ? 'secondary' :
                                invoice.status === 'متأخر' ? 'destructive' : 'outline'
                              }
                            >
                              {invoice.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            العميل: {invoice.customers?.name || 'غير محدد'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            المبلغ: {invoice.total_amount?.toLocaleString('ar-SA')} ر.س
                          </p>
                          <p className="text-sm text-muted-foreground">
                            تاريخ الإصدار: {new Date(invoice.issue_date).toLocaleDateString('ar-SA')}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handleViewInvoice(invoice)}
                          >
                            <Eye className="h-4 w-4" />
                            عرض
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => setPrintingInvoice(invoice)}
                          >
                            <Printer className="h-4 w-4" />
                            طباعة
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handleEditInvoice(invoice)}
                          >
                            <Edit2 className="h-4 w-4" />
                            تعديل
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* نافذة عرض الفاتورة */}
      {viewingInvoice && (
        <Dialog open={!!viewingInvoice} onOpenChange={() => setViewingInvoice(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>معاينة الفاتورة {viewingInvoice.invoice_number}</DialogTitle>
            </DialogHeader>
            <div className="bg-white p-6 rounded-lg shadow-lg" dir="rtl">
              
              {/* Header - ثلاثة أقسام */}
              <div className="grid grid-cols-3 gap-4 items-start mb-6 pb-4 border-b-2 border-blue-800">
                {/* بيانات الشركة - اليمين */}
                <div className="text-right">
                  <h2 className="text-lg font-bold text-blue-800 mb-2">{companyInfo.name}</h2>
                  <p className="text-sm text-gray-600 mb-1">{companyInfo.address}</p>
                  <p className="text-sm text-gray-600 mb-1">هاتف: {companyInfo.phone}</p>
                  <p className="text-sm text-gray-600">البريد: {companyInfo.email}</p>
                </div>

                {/* الشعار - المنتصف */}
                <div className="flex justify-center items-center">
                  {companyInfo.logo && (
                    <img 
                      src={companyInfo.logo} 
                      alt="شعار الوكالة" 
                      className="w-16 h-16 object-contain"
                    />
                  )}
                </div>

                {/* بيانات الفاتورة - اليسار */}
                <div className="text-left">
                  <h1 className="text-2xl font-bold text-blue-800 mb-2">فـاتـورة</h1>
                  <p className="text-sm text-gray-600 mb-1"><strong>رقم الفاتورة:</strong> {viewingInvoice.invoice_number}</p>
                  <p className="text-sm text-gray-600 mb-1"><strong>تاريخ الإصدار:</strong> {new Date(viewingInvoice.issue_date).toLocaleDateString('ar-SA')}</p>
                  <p className="text-sm text-gray-600"><strong>تاريخ الاستحقاق:</strong> {new Date(viewingInvoice.due_date).toLocaleDateString('ar-SA')}</p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 bg-gray-100 p-2 rounded">بيانات العميل:</h3>
                <div className="pr-4">
                  <p className="font-medium text-lg mb-1">{viewingInvoice.customers?.name}</p>
                  {viewingInvoice.customers?.phone && <p className="text-sm text-gray-600">الهاتف: {viewingInvoice.customers.phone}</p>}
                  {viewingInvoice.customers?.address && <p className="text-sm text-gray-600">العنوان: {viewingInvoice.customers.address}</p>}
                </div>
              </div>

              {/* Invoice Details */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 bg-gray-100 p-2 rounded">تفاصيل الفاتورة:</h3>
                
                {/* جدول البنود */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    {/* رأس الجدول */}
                     <thead>
                      <tr className="bg-blue-600 text-white">
                        <th className="border border-gray-300 p-3 text-center font-bold w-24">الإجمالي (ر.س)</th>
                        <th className="border border-gray-300 p-3 text-center font-bold w-20">السعر (ر.س)</th>
                        <th className="border border-gray-300 p-3 text-center font-bold w-16">الكمية</th>
                        <th className="border border-gray-300 p-3 text-center font-bold w-40">اسم البند / الخدمة</th>
                        <th className="border border-gray-300 p-3 text-center font-bold w-8">#</th>
                      </tr>
                    </thead>
                    
                    {/* محتوى الجدول */}
                    <tbody>
                      {viewingInvoice.items && viewingInvoice.items.length > 0 ? (
                        viewingInvoice.items.map((item, index) => (
                          <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                            <td className="border border-gray-300 p-3 text-center font-bold text-blue-600">
                              {item.total_amount?.toLocaleString('ar-SA')}
                            </td>
                            <td className="border border-gray-300 p-3 text-center font-bold">
                              {item.unit_price?.toLocaleString('ar-SA')}
                            </td>
                            <td className="border border-gray-300 p-3 text-center">{item.quantity}</td>
                            <td className="border border-gray-300 p-3 text-right">
                              <div className="font-bold mb-1">{item.item_name}</div>
                              {item.description && (
                                <div className="text-xs text-gray-600">{item.description}</div>
                              )}
                            </td>
                            <td className="border border-gray-300 p-3 text-center font-bold">{index + 1}</td>
                          </tr>
                        ))
                      ) : (
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 p-3 text-center font-bold text-blue-600">
                            {viewingInvoice.amount?.toLocaleString('ar-SA')}
                          </td>
                          <td className="border border-gray-300 p-3 text-center font-bold">
                            {viewingInvoice.amount?.toLocaleString('ar-SA')}
                          </td>
                          <td className="border border-gray-300 p-3 text-center">1</td>
                          <td className="border border-gray-300 p-3 text-right">
                            <div className="font-bold mb-1">خدمات عامة</div>
                            <div className="text-xs text-gray-600">{viewingInvoice.notes || 'خدمات متنوعة'}</div>
                          </td>
                          <td className="border border-gray-300 p-3 text-center font-bold">1</td>
                        </tr>
                      )}
                      
                      {/* إجمالي البنود */}
                      <tr className="bg-blue-50 border-t-2 border-blue-600">
                        <td className="border border-gray-300 p-3 text-center font-bold text-blue-600">
                          {viewingInvoice.amount?.toLocaleString('ar-SA')}
                        </td>
                        <td colSpan={4} className="border border-gray-300 p-3 text-right font-bold">
                          المجموع الفرعي:
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ملخص المبالغ */}
                <div className="mt-4 border-t pt-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm font-medium">المجموع الفرعي:</span>
                      <span className="font-bold">{viewingInvoice.amount?.toLocaleString('ar-SA')} ر.س</span>
                    </div>
                    <div className="flex justify-between items-center py-2 bg-yellow-50 px-3 rounded">
                      <span className="text-sm font-medium">ضريبة القيمة المضافة (15%):</span>
                      <span className="font-bold text-yellow-800">{viewingInvoice.tax_amount?.toLocaleString('ar-SA')} ر.س</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-t border-blue-200">
                      <span className="text-sm font-medium">إجمالي المبلغ المستحق:</span>
                      <span className="font-bold text-lg text-blue-800">{viewingInvoice.total_amount?.toLocaleString('ar-SA')} ر.س</span>
                    </div>
                  </div>
                </div>

                {/* معلومات الحالة */}
                <div className="mt-4 p-3 bg-blue-50 rounded">
                  <h4 className="font-medium text-sm text-blue-800 mb-2">معلومات الحالة:</h4>
                  <div className="grid grid-cols-1 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">حالة الفاتورة:</span>
                      <Badge 
                        className="mr-2"
                        variant={
                          viewingInvoice.status === 'مدفوع' ? 'default' :
                          viewingInvoice.status === 'قيد الانتظار' ? 'secondary' :
                          viewingInvoice.status === 'متأخر' ? 'destructive' : 'outline'
                        }
                      >
                        {viewingInvoice.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="border-t-2 border-blue-800 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-blue-800">
                      المجموع الكلي: {viewingInvoice.total_amount?.toLocaleString('ar-SA')} ر.س
                    </h2>
                  </div>
                  {/* الختم */}
                  {companyInfo.stamp && (
                    <div className="flex justify-center">
                      <img src={companyInfo.stamp} alt="ختم الوكالة" className="h-16 w-auto" />
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {viewingInvoice.notes && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-2">ملاحظات:</h4>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm">{viewingInvoice.notes}</p>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="text-center mt-6 pt-4 border-t border-gray-300">
                <p className="text-gray-700 mb-2 font-medium">شكراً لك على التعامل معنا</p>
                <p className="text-blue-600 italic">{companyInfo.tagline}</p>
                <div className="mt-2">
                  <p className="text-xs text-gray-500">
                    للاستفسارات: {companyInfo.phone} | {companyInfo.email}
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* نافذة طباعة بسيطة */}
      {printingInvoice && (
        <Dialog open={!!printingInvoice} onOpenChange={() => setPrintingInvoice(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>طباعة الفاتورة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-center">
              <p className="text-muted-foreground">
                هل تريد طباعة الفاتورة رقم: <strong>{printingInvoice.invoice_number}</strong>؟
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handlePrintInvoice(printingInvoice)}
                  className="flex-1 gap-2"
                >
                  <Printer className="h-4 w-4" />
                  طباعة الآن
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setPrintingInvoice(null)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* نافذة تعديل/إضافة الفاتورة */}
      {editingInvoice && (
        <Dialog open={!!editingInvoice} onOpenChange={() => setEditingInvoice(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingInvoice.id ? `تعديل الفاتورة ${editingInvoice.invoice_number}` : 'إضافة فاتورة جديدة'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>رقم الفاتورة</Label>
                  <Input
                    value={editingInvoice.invoice_number}
                    onChange={(e) => setEditingInvoice({...editingInvoice, invoice_number: e.target.value})}
                    placeholder="رقم الفاتورة"
                  />
                </div>
                <div className="space-y-2">
                  <Label>العميل</Label>
                  <Select 
                    value={editingInvoice.customer_id}
                    onValueChange={(value) => setEditingInvoice({...editingInvoice, customer_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر العميل" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>تاريخ الإصدار</Label>
                  <Input
                    type="date"
                    value={editingInvoice.issue_date}
                    onChange={(e) => setEditingInvoice({...editingInvoice, issue_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ الاستحقاق</Label>
                  <Input
                    type="date"
                    value={editingInvoice.due_date}
                    onChange={(e) => setEditingInvoice({...editingInvoice, due_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>المبلغ</Label>
                   <Input
                     type="number"
                     value={editingInvoice.subtotal || 0}
                     onChange={(e) => {
                       const subtotal = parseFloat(e.target.value) || 0;
                       const tax = subtotal * 0.15; // 15% ضريبة القيمة المضافة
                       setEditingInvoice({
                         ...editingInvoice, 
                         subtotal: subtotal,
                         tax: tax,
                         total_amount: subtotal + tax
                       });
                     }}
                     placeholder="المبلغ"
                   />
                </div>
                <div className="space-y-2">
                  <Label>الضريبة (15%)</Label>
                   <Input
                     type="number"
                     value={editingInvoice.tax || 0}
                     readOnly
                     className="bg-muted"
                   />
                </div>
                <div className="space-y-2">
                  <Label>المجموع الكلي</Label>
                   <Input
                     type="number"
                     value={editingInvoice.total_amount || 0}
                     readOnly
                     className="bg-muted font-bold"
                   />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الحالة</Label>
                  <Select 
                    value={editingInvoice.status}
                    onValueChange={(value) => setEditingInvoice({...editingInvoice, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="قيد الانتظار">قيد الانتظار</SelectItem>
                      <SelectItem value="مدفوع">مدفوع</SelectItem>
                      <SelectItem value="متأخر">متأخر</SelectItem>
                      <SelectItem value="ملغي">ملغي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>نوع الدفع</Label>
                  <Select 
                    value={editingInvoice.payment_type}
                    onValueChange={(value) => setEditingInvoice({...editingInvoice, payment_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="دفع آجل">دفع آجل</SelectItem>
                      <SelectItem value="دفع فوري">دفع فوري</SelectItem>
                      <SelectItem value="نقدي">نقدي</SelectItem>
                      <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea
                  value={editingInvoice.notes || ''}
                  onChange={(e) => setEditingInvoice({...editingInvoice, notes: e.target.value})}
                  placeholder="ملاحظات إضافية..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={() => saveInvoice(editingInvoice)} className="flex-1">
                  {editingInvoice.id ? 'تحديث الفاتورة' : 'حفظ الفاتورة'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingInvoice(null)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Invoices;