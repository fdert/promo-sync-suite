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

const Invoices = () => {
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

  // دالة جلب بيانات الفواتير مع المدفوعات
  const fetchInvoicesWithPayments = async () => {
    setLoading(true);
    try {
      const { data: invoicesData, error } = await supabase
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      // حساب المدفوعات لكل فاتورة
      const invoicesWithPayments = await Promise.all(
        invoicesData.map(async (invoice) => {
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
            ...invoice,
            total_paid: totalPaid,
            remaining_amount: remainingAmount,
            payment_status: paymentStatus,
            payment_details: allPayments
          };
        })
      );

      setInvoices(invoicesWithPayments);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في جلب بيانات الفواتير",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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

  // دالة طباعة الفاتورة
  const handlePrintInvoice = async (invoice) => {
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

    setPrintingInvoice(updatedInvoice);
    setTimeout(() => {
      window.print();
      setPrintingInvoice(null);
    }, 100);
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

  useEffect(() => {
    fetchCompanyInfo();
    fetchInvoicesWithPayments();
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
          <CardTitle>قائمة الفواتير</CardTitle>
          <CardDescription>
            جميع الفواتير مع تفاصيل المدفوعات والحالة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-gray-300 p-3 text-right">رقم الفاتورة</th>
                  <th className="border border-gray-300 p-3 text-right">العميل</th>
                  <th className="border border-gray-300 p-3 text-center">تاريخ الإصدار</th>
                  <th className="border border-gray-300 p-3 text-center">المبلغ الإجمالي</th>
                  <th className="border border-gray-300 p-3 text-center">المدفوع</th>
                  <th className="border border-gray-300 p-3 text-center">المتبقي</th>
                  <th className="border border-gray-300 p-3 text-center">الحالة</th>
                  <th className="border border-gray-300 p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-muted/50">
                    <td className="border border-gray-300 p-3 font-mono">
                      {invoice.invoice_number}
                    </td>
                    <td className="border border-gray-300 p-3">
                      {invoice.customers?.name || 'غير محدد'}
                    </td>
                    <td className="border border-gray-300 p-3 text-center">
                      {new Date(invoice.issue_date).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="border border-gray-300 p-3 text-center font-bold">
                      {invoice.total_amount?.toLocaleString('ar-SA')} ر.س
                    </td>
                    <td className="border border-gray-300 p-3 text-center">
                      <span className="font-bold text-green-600">
                        {invoice.total_paid?.toLocaleString('ar-SA')} ر.س
                      </span>
                    </td>
                    <td className="border border-gray-300 p-3 text-center">
                      <span className={`font-bold ${invoice.remaining_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {invoice.remaining_amount?.toLocaleString('ar-SA')} ر.س
                      </span>
                    </td>
                    <td className="border border-gray-300 p-3 text-center">
                      <Badge className={getStatusColor(invoice.payment_status)}>
                        {invoice.payment_status}
                      </Badge>
                    </td>
                    <td className="border border-gray-300 p-3">
                      <div className="flex justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewInvoice(invoice)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            handlePrintInvoice(invoice);
                            updatePrintCount(invoice.id);
                          }}
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
            <div className="text-center py-8">
              <p className="text-muted-foreground">لم يتم العثور على فواتير</p>
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