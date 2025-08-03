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
  const handleViewInvoice = (invoice) => {
    setViewingInvoice(invoice);
  };

  const handlePrintInvoice = (invoice) => {
    // إنشاء محتوى HTML للطباعة
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>فاتورة ${invoice.invoice_number}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            font-size: 14px;
            line-height: 1.4;
            color: #000;
            background: #fff;
            padding: 20px;
            max-width: 210mm;
            margin: 0 auto;
          }
          
          .invoice-container {
            width: 100%;
            background: #fff;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #1e40af;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          
          .company-info {
            flex: 1;
            text-align: right;
          }
          
          .company-name {
            font-size: 18px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 8px;
          }
          
          .company-details {
            font-size: 12px;
            color: #555;
            line-height: 1.6;
          }
          
          .logo-section {
            flex: 0 0 80px;
            text-align: center;
            margin: 0 20px;
          }
          
          .company-logo {
            max-width: 70px;
            max-height: 70px;
            object-fit: contain;
          }
          
          .invoice-info {
            flex: 1;
            text-align: left;
          }
          
          .invoice-title {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 10px;
          }
          
          .invoice-details {
            font-size: 12px;
            color: #555;
            line-height: 1.6;
          }
          
          .section {
            margin-bottom: 20px;
          }
          
          .section-title {
            font-size: 14px;
            font-weight: bold;
            background: #f8f9fa;
            padding: 8px 12px;
            border-right: 4px solid #1e40af;
            margin-bottom: 10px;
          }
          
          .customer-info {
            padding: 0 15px;
            font-size: 13px;
          }
          
          .customer-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }
          
          .table td {
            padding: 10px;
            border: 1px solid #ddd;
            font-size: 13px;
          }
          
          .table .label {
            background: #f8f9fa;
            font-weight: bold;
            width: 40%;
          }
          
          .total-section {
            border-top: 3px solid #1e40af;
            padding-top: 15px;
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .total-amount {
            font-size: 20px;
            font-weight: bold;
            color: #1e40af;
          }
          
          .stamp-section {
            text-align: center;
          }
          
          .company-stamp {
            max-width: 80px;
            max-height: 60px;
            object-fit: contain;
          }
          
          .notes {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            margin: 15px 0;
          }
          
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
          }
          
          .footer .thanks {
            font-size: 14px;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
          }
          
          .footer .tagline {
            color: #1e40af;
            font-style: italic;
            margin-bottom: 8px;
          }
          
          @media print {
            body {
              padding: 0;
            }
            
            @page {
              size: A4;
              margin: 15mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          
          <!-- Header -->
          <div class="header">
            <div class="company-info">
              <div class="company-name">${companyInfo.name}</div>
              <div class="company-details">
                <div>${companyInfo.address}</div>
                <div>هاتف: ${companyInfo.phone}</div>
                <div>البريد: ${companyInfo.email}</div>
              </div>
            </div>
            
            <div class="logo-section">
              ${companyInfo.logo ? `<img src="${companyInfo.logo}" alt="شعار الوكالة" class="company-logo">` : ''}
            </div>
            
            <div class="invoice-info">
              <div class="invoice-title">فـاتـورة</div>
              <div class="invoice-details">
                <div><strong>رقم الفاتورة:</strong> ${invoice.invoice_number}</div>
                <div><strong>تاريخ الإصدار:</strong> ${new Date(invoice.issue_date).toLocaleDateString('ar-SA')}</div>
                <div><strong>تاريخ الاستحقاق:</strong> ${new Date(invoice.due_date).toLocaleDateString('ar-SA')}</div>
              </div>
            </div>
          </div>
          
          <!-- Customer Section -->
          <div class="section">
            <div class="section-title">بيانات العميل</div>
            <div class="customer-info">
              <div class="customer-name">${invoice.customers?.name || 'غير محدد'}</div>
              ${invoice.customers?.phone ? `<div>الهاتف: ${invoice.customers.phone}</div>` : ''}
              ${invoice.customers?.address ? `<div>العنوان: ${invoice.customers.address}</div>` : ''}
            </div>
          </div>
          
          <!-- Details Section -->
          <div class="section">
            <div class="section-title">تفاصيل الفاتورة</div>
            
            <!-- وصف الخدمة -->
            <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
              <strong style="color: #1e40af; font-size: 13px;">وصف الخدمة:</strong><br>
              <span style="font-size: 12px;">خدمات الدعاية والإعلان</span>
            </div>
            
            <!-- بنود الفاتورة -->
            <div style="margin-bottom: 15px;">
              <strong style="color: #1e40af; font-size: 13px; margin-bottom: 8px; display: block;">بنود الفاتورة:</strong>
              
              <!-- البند الأول -->
              <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: bold; font-size: 12px;">خدمات التصميم والإبداع</div>
                  <div style="font-size: 10px; color: #666; margin-top: 2px;">الكمية: 1 | الوحدة: خدمة</div>
                </div>
                <div style="font-weight: bold; font-size: 12px; text-align: left;">
                  ${(invoice.amount * 0.6)?.toLocaleString('ar-SA')} ر.س
                </div>
              </div>
              
              <!-- البند الثاني -->
              <div style="background: #fff; border: 1px solid #ddd; padding: 10px; border-radius: 5px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: bold; font-size: 12px;">خدمات الطباعة والإنتاج</div>
                  <div style="font-size: 10px; color: #666; margin-top: 2px;">الكمية: 1 | الوحدة: خدمة</div>
                </div>
                <div style="font-weight: bold; font-size: 12px; text-align: left;">
                  ${(invoice.amount * 0.4)?.toLocaleString('ar-SA')} ر.س
                </div>
              </div>
            </div>
            
            <!-- ملخص المبالغ -->
            <div style="border-top: 1px solid #ddd; padding-top: 10px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="font-size: 12px;">المجموع الفرعي:</span>
                <span style="font-weight: bold; font-size: 12px;">${invoice.amount?.toLocaleString('ar-SA')} ر.س</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; background: #fef3c7; padding: 5px; border-radius: 3px;">
                <span style="font-size: 12px;">ضريبة القيمة المضافة (15%):</span>
                <span style="font-weight: bold; font-size: 12px; color: #92400e;">${invoice.tax_amount?.toLocaleString('ar-SA')} ر.س</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-top: 1px solid #1e40af; padding-top: 5px;">
                <span style="font-size: 13px; font-weight: bold;">إجمالي المبلغ المستحق:</span>
                <span style="font-weight: bold; font-size: 14px; color: #1e40af;">${invoice.total_amount?.toLocaleString('ar-SA')} ر.س</span>
              </div>
            </div>
            
            <!-- معلومات الدفع -->
            <div style="background: #dbeafe; padding: 10px; border-radius: 5px; margin-top: 15px;">
              <strong style="color: #1e40af; font-size: 12px; margin-bottom: 5px; display: block;">معلومات الدفع:</strong>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px;">
                <div>
                  <span style="color: #666;">نوع الدفع:</span>
                  <span style="font-weight: bold; margin-right: 5px;">${invoice.payment_type}</span>
                </div>
                <div>
                  <span style="color: #666;">حالة الفاتورة:</span>
                  <span style="font-weight: bold; margin-right: 5px; padding: 2px 6px; border-radius: 3px; background: ${invoice.status === 'مدفوع' ? '#d1fae5' : invoice.status === 'قيد الانتظار' ? '#fef3c7' : '#fecaca'};">${invoice.status}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Total Section -->
          <div class="total-section">
            <div class="total-amount">
              المجموع الكلي: ${invoice.total_amount?.toLocaleString('ar-SA')} ر.س
            </div>
            <div class="stamp-section">
              ${companyInfo.stamp ? `<img src="${companyInfo.stamp}" alt="ختم الوكالة" class="company-stamp">` : ''}
            </div>
          </div>
          
          <!-- Notes -->
          ${invoice.notes ? `
            <div class="notes">
              <strong>ملاحظات:</strong><br>
              ${invoice.notes}
            </div>
          ` : ''}
          
          <!-- Footer -->
          <div class="footer">
            <div class="thanks">شكراً لك على التعامل معنا</div>
            <div class="tagline">${companyInfo.tagline}</div>
            <div>للاستفسارات: ${companyInfo.phone} | ${companyInfo.email}</div>
          </div>
          
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 1000);
          }
        </script>
      </body>
      </html>
    `;
    
    // فتح نافذة جديدة للطباعة
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
    toast({
      title: "تحت التطوير",
      description: "ميزة تعديل الفاتورة ستكون متاحة قريباً",
    });
  };

  const handleAddInvoice = () => {
    // إعداد فاتورة جديدة
    const newInvoice = {
      invoice_number: `INV-${String(invoices.length + 1).padStart(3, '0')}`,
      customer_id: '',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: 0,
      tax_amount: 0,
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
      if (invoiceData.id) {
        // تحديث فاتورة موجودة
        const { error } = await supabase
          .from('invoices')
          .update(invoiceData)
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
          .insert([invoiceData]);
        
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
        description: "حدث خطأ أثناء حفظ الفاتورة",
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
                            onClick={() => handlePrintInvoice(invoice)}
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
                
                {/* الوصف العام */}
                <div className="mb-4 p-3 border rounded">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">وصف الخدمة:</h4>
                  <p className="text-sm">خدمات الدعاية والإعلان</p>
                </div>

                {/* بنود الفاتورة */}
                <div className="mb-4">
                  <h4 className="font-medium text-sm text-gray-700 mb-3">بنود الفاتورة:</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div className="flex-1">
                        <span className="font-medium">خدمات التصميم والإبداع</span>
                        <div className="text-xs text-gray-500 mt-1">الكمية: 1 | الوحدة: خدمة</div>
                      </div>
                      <div className="text-left">
                        <div className="font-bold">{(viewingInvoice.amount * 0.6)?.toLocaleString('ar-SA')} ر.س</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-white border rounded">
                      <div className="flex-1">
                        <span className="font-medium">خدمات الطباعة والإنتاج</span>
                        <div className="text-xs text-gray-500 mt-1">الكمية: 1 | الوحدة: خدمة</div>
                      </div>
                      <div className="text-left">
                        <div className="font-bold">{(viewingInvoice.amount * 0.4)?.toLocaleString('ar-SA')} ر.س</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ملخص المبالغ */}
                <div className="border-t pt-3">
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

                {/* معلومات الدفع */}
                <div className="mt-4 p-3 bg-blue-50 rounded">
                  <h4 className="font-medium text-sm text-blue-800 mb-2">معلومات الدفع:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">نوع الدفع:</span>
                      <span className="font-medium mr-2">{viewingInvoice.payment_type}</span>
                    </div>
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
                    value={editingInvoice.amount}
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value) || 0;
                      const taxAmount = amount * 0.15; // 15% ضريبة القيمة المضافة
                      setEditingInvoice({
                        ...editingInvoice, 
                        amount: amount,
                        tax_amount: taxAmount,
                        total_amount: amount + taxAmount
                      });
                    }}
                    placeholder="المبلغ"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الضريبة (15%)</Label>
                  <Input
                    type="number"
                    value={editingInvoice.tax_amount}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>المجموع الكلي</Label>
                  <Input
                    type="number"
                    value={editingInvoice.total_amount}
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