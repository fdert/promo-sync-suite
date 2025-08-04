import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardList,
  Search,
  Eye,
  Upload,
  FileText,
  Send,
  Download,
  CheckCircle,
  XCircle,
  Printer,
  Plus,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  whatsapp_number?: string;
  phone?: string;
}

interface Service {
  id: string;
  name: string;
  base_price: number;
}

interface Order {
  id: string;
  order_number: string;
  customers?: {
    id?: string;
    name: string;
    whatsapp_number?: string;
    phone?: string;
  };
  service_name: string;
  description?: string;
  status: string;
  priority: string;
  amount: number;
  due_date?: string;
  created_at: string;
  updated_at: string;
  paid_amount?: number;
  payment_type?: string;
}

interface PrintFile {
  id: string;
  file_name: string;
  file_path: string;
  file_category: string;
  file_size: number;
  upload_date: string;
  sent_to_customer: boolean;
  sent_at: string | null;
  is_approved: boolean;
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // حالات إنشاء طلب جديد
  const [isNewOrderDialogOpen, setIsNewOrderDialogOpen] = useState(false);
  const [newOrderData, setNewOrderData] = useState({
    customer_id: '',
    service_name: '',
    description: '',
    amount: '',
    priority: 'متوسطة',
    payment_type: 'دفع آجل',
    due_date: '',
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  
  // حالات رفع الملفات
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedOrderForUpload, setSelectedOrderForUpload] = useState<Order | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // حالات عرض الملفات
  const [isFilesDialogOpen, setIsFilesDialogOpen] = useState(false);
  const [selectedOrderForFiles, setSelectedOrderForFiles] = useState<Order | null>(null);
  const [orderFiles, setOrderFiles] = useState<PrintFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  
  // حالات إنشاء الفاتورة
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);
  
  // حالات تحديث حالة الطلب
  const [isEditStatusDialogOpen, setIsEditStatusDialogOpen] = useState(false);
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  
  // حالات دفع الدفعات
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentType, setPaymentType] = useState("كاش");
  const [paymentNotes, setPaymentNotes] = useState("");

  const { toast } = useToast();

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers(name, whatsapp_number, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل الطلبات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, whatsapp_number')
        .eq('status', 'نشط')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, base_price')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const createNewOrder = async () => {
    if (!newOrderData.customer_id || !newOrderData.service_name || !newOrderData.amount) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // توليد رقم طلب جديد
      const { data: orderNumber, error: numberError } = await supabase
        .rpc('generate_order_number');

      if (numberError) throw numberError;

      // إنشاء الطلب
      const orderData = {
        order_number: orderNumber,
        customer_id: newOrderData.customer_id,
        service_name: newOrderData.service_name,
        description: newOrderData.description,
        amount: parseFloat(newOrderData.amount),
        priority: newOrderData.priority,
        payment_type: newOrderData.payment_type,
        due_date: newOrderData.due_date || null,
        status: 'جديد',
        created_by: (await supabase.auth.getUser()).data.user?.id,
      };

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      toast({
        title: "تم إنشاء الطلب",
        description: `تم إنشاء الطلب رقم ${newOrder.order_number} بنجاح`,
      });

      // إعادة تعيين البيانات
      setNewOrderData({
        customer_id: '',
        service_name: '',
        description: '',
        amount: '',
        priority: 'متوسطة',
        payment_type: 'دفع آجل',
        due_date: '',
      });

      setIsNewOrderDialogOpen(false);
      fetchOrders();
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "خطأ",
        description: "فشل في إنشاء الطلب",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderFiles = async (orderId: string) => {
    setFilesLoading(true);
    try {
      const { data, error } = await supabase
        .from('print_files')
        .select('*')
        .eq('print_order_id', orderId);

      if (error) throw error;
      setOrderFiles(data || []);
    } catch (error) {
      console.error('Error fetching order files:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل ملفات الطلب",
        variant: "destructive",
      });
    } finally {
      setFilesLoading(false);
    }
  };

  const generateInvoice = async (order: Order) => {
    setLoading(true);
    
    try {
      // التحقق من وجود فاتورة مسبقة للطلب
      const { data: existingInvoice, error: checkError } = await supabase
        .from('invoices')
        .select('id, invoice_number')
        .eq('order_id', order.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingInvoice) {
        console.log('Found existing invoice:', existingInvoice.invoice_number);
        toast({
          title: "فاتورة موجودة",
          description: `الفاتورة ${existingInvoice.invoice_number} موجودة بالفعل لهذا الطلب`,
          variant: "default",
        });
        
        // فتح الفاتورة الموجودة
        console.log('🚀 Opening existing invoice preview:', `/invoice/${existingInvoice.id}`);
        console.log('Invoice ID for preview:', existingInvoice.id);
        window.open(`/invoice/${existingInvoice.id}`, '_blank');
        setIsInvoiceDialogOpen(false);
        setSelectedOrderForInvoice(null);
        setLoading(false);
        return;
      }
      
      // جلب بيانات الطلب مع بنوده
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          customers(*)
        `)
        .eq('id', order.id)
        .single();

      if (orderError) throw orderError;

      // توليد رقم فاتورة جديد
      const { data: invoiceNumber, error: numberError } = await supabase
        .rpc('generate_invoice_number');

      if (numberError) throw numberError;

      // إنشاء الفاتورة
      const invoiceData = {
        invoice_number: invoiceNumber,
        customer_id: orderData.customer_id,
        order_id: orderData.id,
        amount: orderData.amount,
        tax_amount: 0,
        total_amount: orderData.amount,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 يوم من اليوم
        status: 'قيد الانتظار',
        payment_type: orderData.payment_type || 'دفع آجل',
        paid_amount: orderData.paid_amount || 0,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      };

      const { data: newInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // إنشاء بنود الفاتورة
      const invoiceItem = {
        invoice_id: newInvoice.id,
        item_name: orderData.service_name,
        description: orderData.description || '',
        quantity: 1,
        unit_price: orderData.amount,
        total_amount: orderData.amount,
      };

      const { error: itemError } = await supabase
        .from('invoice_items')
        .insert(invoiceItem);

      if (itemError) throw itemError;

      toast({
        title: "تم إنشاء الفاتورة",
        description: `تم إنشاء الفاتورة رقم ${newInvoice.invoice_number} بنجاح${orderData.customers?.whatsapp_number ? ' وإرسالها للعميل' : ''}`,
      });

      console.log('=== Invoice Creation Success ===');
      console.log('Created invoice:', newInvoice);
      console.log('Invoice ID:', newInvoice.id);
      console.log('Opening URL:', `/invoice/${newInvoice.id}`);

      // فتح الفاتورة في نافذة جديدة للمعاينة
      console.log('🚀 Opening new invoice preview:', `/invoice/${newInvoice.id}`);
      console.log('New Invoice ID for preview:', newInvoice.id);
      window.open(`/invoice/${newInvoice.id}`, '_blank');
      
      setIsInvoiceDialogOpen(false);
      setSelectedOrderForInvoice(null);
      
      fetchOrders();
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast({
        title: "خطأ",
        description: "فشل في إنشاء الفاتورة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
    fetchServices();
  }, []);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.service_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'جديد': { variant: 'secondary' as const, color: 'blue' },
      'مؤكد': { variant: 'default' as const, color: 'green' },
      'قيد التنفيذ': { variant: 'default' as const, color: 'yellow' },
      'قيد المراجعة': { variant: 'outline' as const, color: 'orange' },
      'جاهز للتسليم': { variant: 'default' as const, color: 'purple' },
      'مكتمل': { variant: 'default' as const, color: 'green' },
      'ملغي': { variant: 'destructive' as const, color: 'red' },
      'قيد الانتظار': { variant: 'secondary' as const, color: 'gray' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { variant: 'secondary' as const, color: 'gray' };
    return <Badge variant={config.variant}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      'عالية': { variant: 'destructive' as const },
      'متوسطة': { variant: 'default' as const },
      'منخفضة': { variant: 'secondary' as const }
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || { variant: 'secondary' as const };
    return <Badge variant={config.variant}>{priority}</Badge>;
  };

  if (loading) {
    return <div className="flex justify-center p-8">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* العنوان والبحث */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8" />
            إدارة الطلبات
          </h1>
          <p className="text-muted-foreground mt-1">
            عرض وإدارة جميع الطلبات مع إمكانية رفع الملفات
          </p>
        </div>
        <Button onClick={() => setIsNewOrderDialogOpen(true)} className="bg-primary">
          <Plus className="h-4 w-4 ml-2" />
          طلب جديد
        </Button>
      </div>

      {/* فلاتر البحث */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="البحث برقم الطلب، اسم العميل، أو نوع الخدمة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="فلترة حسب الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="جديد">جديد</SelectItem>
                <SelectItem value="مؤكد">مؤكد</SelectItem>
                <SelectItem value="قيد التنفيذ">قيد التنفيذ</SelectItem>
                <SelectItem value="قيد المراجعة">قيد المراجعة</SelectItem>
                <SelectItem value="جاهز للتسليم">جاهز للتسليم</SelectItem>
                <SelectItem value="مكتمل">مكتمل</SelectItem>
                <SelectItem value="ملغي">ملغي</SelectItem>
                <SelectItem value="قيد الانتظار">قيد الانتظار</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* جدول الطلبات */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الطلبات ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>الخدمة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الأولوية</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>تاريخ الاستحقاق</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.order_number}
                    </TableCell>
                    <TableCell>{order.customers?.name}</TableCell>
                    <TableCell>{order.service_name}</TableCell>
                    <TableCell>
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell>
                      {getPriorityBadge(order.priority)}
                    </TableCell>
                    <TableCell>{order.amount} ر.س</TableCell>
                    <TableCell>
                      {order.due_date ? new Date(order.due_date).toLocaleDateString('ar-SA') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrderForInvoice(order);
                            setIsInvoiceDialogOpen(true);
                          }}
                        >
                          <Printer className="h-3 w-3 mr-1" />
                          فاتورة
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* حوار إنشاء طلب جديد */}
      <Dialog open={isNewOrderDialogOpen} onOpenChange={setIsNewOrderDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إنشاء طلب جديد</DialogTitle>
            <DialogDescription>
              أدخل تفاصيل الطلب الجديد
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer">العميل *</Label>
                <Select value={newOrderData.customer_id} onValueChange={(value) => 
                  setNewOrderData(prev => ({ ...prev, customer_id: value }))
                }>
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
                <Label htmlFor="service">نوع الخدمة *</Label>
                <Select value={newOrderData.service_name} onValueChange={(value) => {
                  const selectedService = services.find(s => s.name === value);
                  setNewOrderData(prev => ({ 
                    ...prev, 
                    service_name: value,
                    amount: selectedService?.base_price?.toString() || prev.amount
                  }));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع الخدمة" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.name}>
                        {service.name} - {service.base_price} ر.س
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                placeholder="وصف تفصيلي للطلب..."
                value={newOrderData.description}
                onChange={(e) => setNewOrderData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">المبلغ *</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={newOrderData.amount}
                  onChange={(e) => setNewOrderData(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="priority">الأولوية</Label>
                <Select value={newOrderData.priority} onValueChange={(value) => 
                  setNewOrderData(prev => ({ ...prev, priority: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="عالية">عالية</SelectItem>
                    <SelectItem value="متوسطة">متوسطة</SelectItem>
                    <SelectItem value="منخفضة">منخفضة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payment_type">نوع الدفع</Label>
                <Select value={newOrderData.payment_type} onValueChange={(value) => 
                  setNewOrderData(prev => ({ ...prev, payment_type: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="كاش">كاش</SelectItem>
                    <SelectItem value="الشبكة">الشبكة</SelectItem>
                    <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
                    <SelectItem value="دفع آجل">دفع آجل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="due_date">تاريخ الاستحقاق</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={newOrderData.due_date}
                  onChange={(e) => setNewOrderData(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setIsNewOrderDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button 
                onClick={createNewOrder}
                disabled={loading}
              >
                {loading ? "جاري الإنشاء..." : "إنشاء الطلب"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* حوار إنشاء الفاتورة */}
      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إنشاء فاتورة للطلب</DialogTitle>
            <DialogDescription>
              سيتم إنشاء فاتورة للطلب {selectedOrderForInvoice?.order_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>العميل</Label>
              <p className="text-sm text-muted-foreground">
                {selectedOrderForInvoice?.customers?.name}
              </p>
            </div>
            <div>
              <Label>الخدمة</Label>
              <p className="text-sm text-muted-foreground">
                {selectedOrderForInvoice?.service_name}
              </p>
            </div>
            <div>
              <Label>المبلغ</Label>
              <p className="text-sm text-muted-foreground">
                {selectedOrderForInvoice?.amount} ر.س
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setIsInvoiceDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button 
                onClick={() => selectedOrderForInvoice && generateInvoice(selectedOrderForInvoice)}
                disabled={loading}
              >
                {loading ? "جاري الإنشاء..." : "إنشاء الفاتورة"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;