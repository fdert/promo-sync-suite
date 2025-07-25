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
import { Plus, Search, Eye, Printer, MessageCircle, Calendar, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [newInvoice, setNewInvoice] = useState({
    customer_id: "",
    amount: "",
    tax_amount: "",
    due_date: "",
    is_deferred: false,
    notes: "",
    payment_method: ""
  });

  const { toast } = useToast();

  // جلب الفواتير من قاعدة البيانات
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers(name, phone, whatsapp_number)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching invoices:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في جلب بيانات الفواتير",
          variant: "destructive",
        });
        return;
      }

      setInvoices(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // جلب العملاء
  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .eq('status', 'نشط')
        .order('name');

      if (error) {
        console.error('Error fetching customers:', error);
        return;
      }

      setCustomers(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
  }, []);

  // إضافة فاتورة جديدة
  const handleAddInvoice = async () => {
    if (!newInvoice.customer_id || !newInvoice.amount || !newInvoice.due_date) {
      toast({
        title: "خطأ",
        description: "يرجى ملء الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');
      
      const total_amount = parseFloat(newInvoice.amount) + (parseFloat(newInvoice.tax_amount) || 0);
      
      const { error } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          customer_id: newInvoice.customer_id,
          amount: parseFloat(newInvoice.amount),
          tax_amount: parseFloat(newInvoice.tax_amount) || 0,
          total_amount: total_amount,
          due_date: newInvoice.due_date,
          is_deferred: newInvoice.is_deferred,
          notes: newInvoice.notes,
          payment_method: newInvoice.payment_method,
          status: 'قيد الانتظار'
        });

      if (error) {
        console.error('Error adding invoice:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في إضافة الفاتورة",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "نجح",
        description: "تم إضافة الفاتورة بنجاح",
      });

      setIsAddDialogOpen(false);
      setNewInvoice({
        customer_id: "",
        amount: "",
        tax_amount: "",
        due_date: "",
        is_deferred: false,
        notes: "",
        payment_method: ""
      });
      fetchInvoices();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // طباعة الفاتورة
  const handlePrintInvoice = async (invoice) => {
    try {
      // تحديث عداد الطباعة
      await supabase
        .from('invoices')
        .update({ 
          print_count: (invoice.print_count || 0) + 1,
          last_printed_at: new Date().toISOString()
        })
        .eq('id', invoice.id);

      // فتح نافذة الطباعة
      window.print();
      
      toast({
        title: "نجح",
        description: "تم إرسال الفاتورة للطباعة",
      });
    } catch (error) {
      console.error('Error printing invoice:', error);
    }
  };

  // إرسال الفاتورة عبر واتس آب
  const handleSendWhatsApp = async (invoice) => {
    try {
      const customerPhone = invoice.customers?.whatsapp_number || invoice.customers?.phone;
      if (!customerPhone) {
        toast({
          title: "خطأ",
          description: "رقم الواتس آب غير متوفر للعميل",
          variant: "destructive",
        });
        return;
      }

      // هنا يمكن استدعاء API لإرسال الواتس آب
      const message = `مرحباً ${invoice.customers?.name}، نود إعلامكم بأن فاتورتكم رقم ${invoice.invoice_number} بقيمة ${invoice.total_amount} ر.س جاهزة للدفع. تاريخ الاستحقاق: ${invoice.due_date}`;
      
      // رابط واتس آب
      const whatsappUrl = `https://wa.me/${customerPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      // تحديث وقت الإرسال
      await supabase
        .from('invoices')
        .update({ whatsapp_sent_at: new Date().toISOString() })
        .eq('id', invoice.id);

      toast({
        title: "نجح",
        description: "تم فتح واتس آب لإرسال الفاتورة",
      });
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "مدفوع":
        return <Badge className="bg-success/10 text-success">مدفوع</Badge>;
      case "قيد الانتظار":
        return <Badge className="bg-warning/10 text-warning-foreground">قيد الانتظار</Badge>;
      case "متأخر":
        return <Badge className="bg-destructive/10 text-destructive">متأخر</Badge>;
      default:
        return <Badge>غير محدد</Badge>;
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const customerName = invoice.customers?.name || '';
    const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة الفواتير</h1>
          <p className="text-muted-foreground">إنشاء ومتابعة الفواتير والمدفوعات</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إنشاء فاتورة جديدة
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الفواتير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">+2 من الشهر الماضي</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الفواتير المدفوعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground">75% من الإجمالي</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المبلغ المستحق</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15,500 ر.س</div>
            <p className="text-xs text-muted-foreground">6 فواتير قيد الانتظار</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الفواتير المتأخرة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">3</div>
            <p className="text-xs text-muted-foreground">تحتاج متابعة فورية</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">البحث</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="البحث بالاسم أو رقم الفاتورة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>حالة الفاتورة</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفواتير</SelectItem>
                  <SelectItem value="paid">مدفوع</SelectItem>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                  <SelectItem value="overdue">متأخر</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الفواتير</CardTitle>
          <CardDescription>جميع الفواتير الخاصة بك</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="font-medium">{invoice.invoice_number}</h3>
                    <p className="text-sm text-muted-foreground">{invoice.customers?.name}</p>
                  </div>
                  <div>
                    <p className="font-medium">{invoice.total_amount?.toLocaleString()} ر.س</p>
                    <p className="text-sm text-muted-foreground">تاريخ الاستحقاق: {invoice.due_date}</p>
                  </div>
                  {getStatusBadge(invoice.status)}
                  {invoice.is_deferred && (
                    <Badge variant="outline" className="text-warning border-warning/20">
                      آجل
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handlePrintInvoice(invoice)}>
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleSendWhatsApp(invoice)}>
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Invoice Dialog */}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>إنشاء فاتورة جديدة</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer">العميل</Label>
              <Select value={newInvoice.customer_id} onValueChange={(value) => setNewInvoice({...newInvoice, customer_id: value})}>
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
            <div>
              <Label htmlFor="amount">المبلغ (ر.س)</Label>
              <Input
                id="amount"
                type="number"
                value={newInvoice.amount}
                onChange={(e) => setNewInvoice({...newInvoice, amount: e.target.value})}
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tax_amount">الضريبة (ر.س)</Label>
              <Input
                id="tax_amount"
                type="number"
                value={newInvoice.tax_amount}
                onChange={(e) => setNewInvoice({...newInvoice, tax_amount: e.target.value})}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="due_date">تاريخ الاستحقاق</Label>
              <Input
                id="due_date"
                type="date"
                value={newInvoice.due_date}
                onChange={(e) => setNewInvoice({...newInvoice, due_date: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_method">طريقة الدفع</Label>
              <Select value={newInvoice.payment_method} onValueChange={(value) => setNewInvoice({...newInvoice, payment_method: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر طريقة الدفع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="نقدي">نقدي</SelectItem>
                  <SelectItem value="بنكي">تحويل بنكي</SelectItem>
                  <SelectItem value="بطاقة ائتمان">بطاقة ائتمان</SelectItem>
                  <SelectItem value="شيك">شيك</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_deferred"
                checked={newInvoice.is_deferred}
                onCheckedChange={(checked) => setNewInvoice({...newInvoice, is_deferred: checked})}
              />
              <Label htmlFor="is_deferred">فاتورة آجلة</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              value={newInvoice.notes}
              onChange={(e) => setNewInvoice({...newInvoice, notes: e.target.value})}
              placeholder="ملاحظات إضافية..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleAddInvoice}>
              إنشاء الفاتورة
            </Button>
          </div>
        </div>
      </DialogContent>
    </div>
  );
};

export default Invoices;