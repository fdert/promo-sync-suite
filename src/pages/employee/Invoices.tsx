import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

const EmployeeInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);
  const { toast } = useToast();

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

      if (!error && data) {
        // جلب معلومات المدفوعات لكل فاتورة
        const invoicesWithPayments = await Promise.all(
          data.map(async (invoice: any) => {
            const { data: payments, error: paymentsError } = await supabase
              .from('payments')
              .select('amount')
              .eq('invoice_id', invoice.id);

            if (!paymentsError && payments) {
              const totalPaid = payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
              const remainingAmount = invoice.total_amount - totalPaid;
              
              let paymentStatus = 'غير مدفوعة';
              if (totalPaid >= invoice.total_amount) {
                paymentStatus = 'مدفوعة';
              } else if (totalPaid > 0) {
                paymentStatus = 'مدفوعة جزئياً';
              }

              return {
                ...invoice,
                total_paid: totalPaid,
                remaining_amount: remainingAmount,
                payment_status: paymentStatus
              };
            }
            
            return {
              ...invoice,
              total_paid: 0,
              remaining_amount: invoice.total_amount,
              payment_status: 'غير مدفوعة'
            };
          })
        );
        
        setInvoices(invoicesWithPayments);
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

  const fetchCompanyInfo = async () => {
    try {
      const { data } = await supabase
        .from('website_settings')
        .select('setting_value')
        .eq('setting_key', 'website_content')
        .maybeSingle();

      if (data?.setting_value && typeof data.setting_value === 'object') {
        const websiteContent = data.setting_value as any;
        setCompanyInfo(websiteContent.companyInfo);
      }
    } catch (error) {
      console.error('Error fetching company info:', error);
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

  const handlePreview = async (invoice: any) => {
    setSelectedInvoice({
      ...invoice,
      actual_status: invoice.payment_status,
      total_paid: invoice.total_paid,
      remaining_amount: invoice.remaining_amount
    });
    
    // جلب بنود الفاتورة
    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id);
    
    setInvoiceItems(items || []);
    setIsPreviewOpen(true);
  };

  const handlePrint = () => {
    if (selectedInvoice) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const printContent = document.querySelector('.print-invoice')?.innerHTML;
        printWindow.document.write(`
          <html>
            <head>
              <title>طباعة فاتورة ${selectedInvoice.invoice_number}</title>
              <style>
                body { font-family: Arial, sans-serif; direction: rtl; margin: 0; padding: 20px; }
                .print-invoice { display: block !important; }
                @media print {
                  body { margin: 0; padding: 0; }
                  .print-invoice { padding: 10px; }
                }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const filteredInvoices = invoices.filter((invoice: any) => {
    const matchesSearch = invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div>جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">الفواتير</h1>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الفواتير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المدفوعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {invoices.filter((invoice: any) => invoice.payment_status === 'مدفوعة').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">جزئياً</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {invoices.filter((invoice: any) => invoice.payment_status === 'مدفوعة جزئياً').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">غير مدفوعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {invoices.filter((invoice: any) => invoice.payment_status === 'غير مدفوعة').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="البحث بالرقم أو اسم العميل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="حالة الدفع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الفواتير</SelectItem>
            <SelectItem value="مدفوعة">مدفوعة</SelectItem>
            <SelectItem value="مدفوعة جزئياً">مدفوعة جزئياً</SelectItem>
            <SelectItem value="غير مدفوعة">غير مدفوعة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الفواتير</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                لا توجد فواتير
              </div>
            ) : (
              filteredInvoices.map((invoice: any) => (
                <div key={invoice.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{invoice.invoice_number}</span>
                        <Badge 
                          variant={
                            invoice.payment_status === 'مدفوعة' ? 'default' : 
                            invoice.payment_status === 'مدفوعة جزئياً' ? 'secondary' : 
                            'destructive'
                          }
                        >
                          {invoice.payment_status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p><strong>العميل:</strong> {invoice.customers?.name}</p>
                        <p><strong>تاريخ الإصدار:</strong> {new Date(invoice.issue_date).toLocaleDateString('ar-SA')}</p>
                        <p><strong>تاريخ الاستحقاق:</strong> {new Date(invoice.due_date).toLocaleDateString('ar-SA')}</p>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span><strong>الإجمالي:</strong> {invoice.total_amount?.toLocaleString()} ر.س</span>
                        <span className="text-green-600"><strong>المدفوع:</strong> {invoice.total_paid?.toLocaleString()} ر.س</span>
                        <span className="text-red-600"><strong>المتبقي:</strong> {invoice.remaining_amount?.toLocaleString()} ر.س</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(invoice)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Preview Dialog */}
      <InvoicePreview
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        invoice={selectedInvoice}
        items={invoiceItems}
        onPrint={handlePrint}
        companyInfo={companyInfo}
      />

      {/* Hidden Print Component */}
      {selectedInvoice && (
        <InvoicePrint
          invoice={selectedInvoice}
          items={invoiceItems}
          companyInfo={companyInfo}
        />
      )}
    </div>
  );
};

export default EmployeeInvoices;
