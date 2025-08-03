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
    setPrintingInvoice(invoice);
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
              
              {/* Header */}
              <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-blue-800">
                {/* بيانات الشركة والشعار - اليمين */}
                <div className="flex items-start gap-3">
                  {companyInfo.logo && (
                    <img 
                      src={companyInfo.logo} 
                      alt="شعار الوكالة" 
                      className="w-12 h-12 object-contain"
                    />
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-blue-800 mb-1">{companyInfo.name}</h2>
                    <p className="text-sm text-gray-600">{companyInfo.address}</p>
                    <p className="text-sm text-gray-600">هاتف: {companyInfo.phone}</p>
                    <p className="text-sm text-gray-600">البريد: {companyInfo.email}</p>
                  </div>
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
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <tbody>
                      <tr className="border-b bg-gray-50">
                        <td className="p-3 font-medium">الوصف</td>
                        <td className="p-3">خدمات الدعاية والإعلان</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3 font-medium">المبلغ الأساسي</td>
                        <td className="p-3">{viewingInvoice.amount?.toLocaleString('ar-SA')} ر.س</td>
                      </tr>
                      <tr className="border-b bg-gray-50">
                        <td className="p-3 font-medium">ضريبة القيمة المضافة (15%)</td>
                        <td className="p-3">{viewingInvoice.tax_amount?.toLocaleString('ar-SA')} ر.س</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3 font-medium">نوع الدفع</td>
                        <td className="p-3">{viewingInvoice.payment_type}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">الحالة</td>
                        <td className="p-3">
                          <Badge 
                            variant={
                              viewingInvoice.status === 'مدفوع' ? 'default' :
                              viewingInvoice.status === 'قيد الانتظار' ? 'secondary' :
                              viewingInvoice.status === 'متأخر' ? 'destructive' : 'outline'
                            }
                          >
                            {viewingInvoice.status}
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
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

      {/* نافذة طباعة الفاتورة */}
      {printingInvoice && (
        <Dialog open={!!printingInvoice} onOpenChange={() => setPrintingInvoice(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>طباعة الفاتورة {printingInvoice.invoice_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Button 
                onClick={() => window.print()} 
                className="w-full gap-2 no-print"
              >
                <Printer className="h-4 w-4" />
                طباعة الفاتورة
              </Button>
              
              {/* إضافة CSS للطباعة */}
              <style>{`
                @media print {
                  .no-print { display: none !important; }
                  body * { visibility: hidden; }
                  .print-content, .print-content * { visibility: visible; }
                  .print-content { 
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100% !important;
                    height: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                  @page {
                    size: A5 portrait;
                    margin: 8mm !important;
                  }
                  .invoice-container {
                    width: 100% !important;
                    height: 100% !important;
                    max-height: 185mm !important;
                    font-size: 10px !important;
                    line-height: 1.2 !important;
                    box-sizing: border-box;
                    overflow: hidden;
                  }
                  .header-section {
                    height: 50mm !important;
                    display: flex !important;
                    align-items: flex-start !important;
                    border-bottom: 2px solid #1e40af !important;
                    margin-bottom: 3mm !important;
                    padding-bottom: 2mm !important;
                  }
                  .customer-section {
                    height: 22mm !important;
                    margin-bottom: 3mm !important;
                  }
                  .details-section {
                    height: 35mm !important;
                    margin-bottom: 3mm !important;
                  }
                  .total-section {
                    height: 25mm !important;
                    border-top: 2px solid #1e40af !important;
                    padding-top: 2mm !important;
                    margin-bottom: 3mm !important;
                  }
                  .footer-section {
                    height: 18mm !important;
                    text-align: center !important;
                  }
                  .company-logo {
                    max-height: 25mm !important;
                    max-width: 25mm !important;
                    object-fit: contain !important;
                  }
                  .company-stamp {
                    max-height: 15mm !important;
                    max-width: 20mm !important;
                    object-fit: contain !important;
                  }
                  .text-xs { font-size: 8px !important; }
                  .text-sm { font-size: 9px !important; }
                  .text-lg { font-size: 11px !important; }
                  .text-xl { font-size: 12px !important; }
                  .text-2xl { font-size: 14px !important; }
                  table { border-collapse: collapse !important; }
                  td { padding: 1mm !important; }
                }
              `}</style>

              <div className="print-content bg-white p-4 rounded-lg shadow-lg max-w-4xl mx-auto" dir="rtl">
                <div className="invoice-container">
                  
                  {/* Header Section */}
                  <div className="header-section">
                    {/* بيانات الشركة والشعار - اليمين */}
                    <div className="w-2/5 flex items-start gap-2">
                      {companyInfo.logo && (
                        <img 
                          src={companyInfo.logo} 
                          alt="شعار الوكالة" 
                          className="company-logo flex-shrink-0"
                        />
                      )}
                      <div className="flex-grow">
                        <h2 className="text-lg font-bold text-blue-800 mb-1">{companyInfo.name}</h2>
                        <p className="text-xs mb-1">{companyInfo.address}</p>
                        <p className="text-xs mb-1">هاتف: {companyInfo.phone}</p>
                        <p className="text-xs">البريد: {companyInfo.email}</p>
                      </div>
                    </div>

                    {/* بيانات الفاتورة - اليسار */}
                    <div className="w-3/5 text-left">
                      <h1 className="text-2xl font-bold text-blue-800 mb-2">فـاتـورة</h1>
                      <p className="text-xs mb-1"><strong>رقم الفاتورة:</strong> {printingInvoice.invoice_number}</p>
                      <p className="text-xs mb-1"><strong>تاريخ الإصدار:</strong> {new Date(printingInvoice.issue_date).toLocaleDateString('ar-SA')}</p>
                      <p className="text-xs"><strong>تاريخ الاستحقاق:</strong> {new Date(printingInvoice.due_date).toLocaleDateString('ar-SA')}</p>
                    </div>
                  </div>

                  {/* Customer Section */}
                  <div className="customer-section">
                    <h3 className="text-sm font-bold mb-1 bg-gray-100 p-1">بيانات العميل:</h3>
                    <div className="pr-2">
                      <p className="text-sm font-medium mb-0">{printingInvoice.customers?.name}</p>
                      {printingInvoice.customers?.phone && (
                        <p className="text-xs mb-0">الهاتف: {printingInvoice.customers.phone}</p>
                      )}
                      {printingInvoice.customers?.address && (
                        <p className="text-xs">العنوان: {printingInvoice.customers.address}</p>
                      )}
                    </div>
                  </div>

                  {/* Details Section */}
                  <div className="details-section">
                    <h3 className="text-sm font-bold mb-1 bg-gray-100 p-1">تفاصيل الفاتورة:</h3>
                    <div className="border border-gray-300 rounded overflow-hidden">
                      <table className="w-full text-xs">
                        <tbody>
                          <tr className="border-b">
                            <td className="p-1 font-medium bg-gray-50">الوصف</td>
                            <td className="p-1">خدمات الدعاية والإعلان</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-1 font-medium">المبلغ الأساسي</td>
                            <td className="p-1">{printingInvoice.amount?.toLocaleString('ar-SA')} ر.س</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-1 font-medium bg-gray-50">ضريبة القيمة المضافة (15%)</td>
                            <td className="p-1">{printingInvoice.tax_amount?.toLocaleString('ar-SA')} ر.س</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-1 font-medium">نوع الدفع</td>
                            <td className="p-1">{printingInvoice.payment_type}</td>
                          </tr>
                          <tr>
                            <td className="p-1 font-medium bg-gray-50">الحالة</td>
                            <td className="p-1">
                              <span className={`px-1 py-0 rounded text-xs ${
                                printingInvoice.status === 'مدفوع' ? 'bg-green-100' :
                                printingInvoice.status === 'قيد الانتظار' ? 'bg-yellow-100' :
                                'bg-red-100'
                              }`}>
                                {printingInvoice.status}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Total Section */}
                  <div className="total-section">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-right flex-grow">
                        <h2 className="text-lg font-bold text-blue-800">
                          المجموع الكلي: {printingInvoice.total_amount?.toLocaleString('ar-SA')} ر.س
                        </h2>
                      </div>
                      {/* الختم أسفل المجموع الكلي */}
                      <div className="flex justify-end mr-4">
                        {companyInfo.stamp && (
                          <img 
                            src={companyInfo.stamp} 
                            alt="ختم الوكالة" 
                            className="company-stamp object-contain"
                          />
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    {printingInvoice.notes && (
                      <div className="mt-2">
                        <h4 className="text-xs font-bold mb-1">ملاحظات:</h4>
                        <p className="text-xs bg-gray-50 p-1 rounded">{printingInvoice.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Footer Section */}
                  <div className="footer-section">
                    <div className="border-t border-gray-300 pt-2">
                      <p className="text-sm font-medium text-gray-700 mb-1">شكراً لك على التعامل معنا</p>
                      <p className="text-blue-600 italic text-xs font-medium">{companyInfo.tagline}</p>
                      <div className="mt-1">
                        <p className="text-xs text-gray-500">
                          للاستفسارات: {companyInfo.phone} | {companyInfo.email}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
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