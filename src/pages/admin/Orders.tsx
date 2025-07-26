import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Plus,
  Search,
  Eye,
  Edit,
  MessageSquare,
  Calendar,
  DollarSign,
  User,
  Clock,
  Upload,
  FileText,
  CreditCard,
  Trash2,
  Package,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CustomerSearchSelect } from "@/components/ui/customer-search-select";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [newOrder, setNewOrder] = useState({
    customer_id: "",
    service_id: "",
    service_name: "",
    description: "",
    due_date: "",
    amount: "",
    priority: "متوسطة",
    paid_amount: "",
    remaining_amount: "",
    payment_type: "دفع آجل",
    payment_notes: "",
    attachment_files: []
  });

  const [showPayments, setShowPayments] = useState(false);
  const [selectedOrderPayments, setSelectedOrderPayments] = useState(null);
  const [payments, setPayments] = useState([]);

  const [orderItems, setOrderItems] = useState([
    { item_name: "", description: "", quantity: 1, unit_price: 0, total_amount: 0 }
  ]);

  const { toast } = useToast();

  // إدارة البنود
  const addOrderItem = () => {
    setOrderItems([...orderItems, { item_name: "", description: "", quantity: 1, unit_price: 0, total_amount: 0 }]);
  };

  const removeOrderItem = (index: number) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    }
  };

  const updateOrderItem = (index: number, field: string, value: any) => {
    const updatedItems = orderItems.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        
        // حساب المجموع تلقائياً
        if (field === 'quantity' || field === 'unit_price') {
          updatedItem.total_amount = updatedItem.quantity * updatedItem.unit_price;
        }
        
        return updatedItem;
      }
      return item;
    });
    
    setOrderItems(updatedItems);
    
    // تحديث إجمالي مبلغ الطلب وحساب المبلغ المتبقي
    const totalAmount = updatedItems.reduce((sum, item) => sum + item.total_amount, 0);
    const paidAmount = parseFloat(newOrder.paid_amount) || 0;
    const remainingAmount = totalAmount - paidAmount;
    
    setNewOrder({ 
      ...newOrder, 
      amount: totalAmount.toString(),
      remaining_amount: remainingAmount.toString()
    });
  };

  // إعادة تعيين البنود
  const resetOrderItems = () => {
    setOrderItems([{ item_name: "", description: "", quantity: 1, unit_price: 0, total_amount: 0 }]);
  };

  // جلب المدفوعات لطلب معين
  const fetchOrderPayments = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  };

  // إضافة دفعة جديدة
  const addPayment = async (orderId: string, amount: number, paymentType: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .insert({
          order_id: orderId,
          amount: amount,
          payment_type: paymentType,
          notes: notes
        });

      if (error) {
        console.error('Error adding payment:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في إضافة الدفعة",
          variant: "destructive",
        });
        return false;
      }

      // تحديث المبلغ المدفوع في الطلب
      const order = orders.find(o => o.id === orderId);
      if (order) {
        const newPaidAmount = (order.paid_amount || 0) + amount;
        await supabase
          .from('orders')
          .update({ paid_amount: newPaidAmount })
          .eq('id', orderId);
      }

      toast({
        title: "تم إضافة الدفعة",
        description: "تم إضافة الدفعة بنجاح",
      });

      await fetchData();
      return true;
    } catch (error) {
      console.error('Error:', error);
      return false;
    }
  };

  // تحويل طلب إلى فاتورة
  const convertToInvoice = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على الطلب",
          variant: "destructive",
        });
        return false;
      }

      // التحقق من أن الطلب مكتمل
      if (order.status !== 'مكتمل') {
        toast({
          title: "تنبيه",
          description: "يُفضل تحويل الطلبات المكتملة فقط إلى فواتير",
          variant: "destructive",
        });
        // يمكن المتابعة لكن مع التحذير
      }

      // إنشاء رقم فاتورة
      const { data: invoiceNumber, error: numberError } = await supabase
        .rpc('generate_invoice_number');

      if (numberError) {
        console.error('Error generating invoice number:', numberError);
        toast({
          title: "خطأ",
          description: "حدث خطأ في توليد رقم الفاتورة",
          variant: "destructive",
        });
        return false;
      }

      // إنشاء الفاتورة
      const invoiceData = {
        invoice_number: invoiceNumber,
        customer_id: order.customer_id,
        order_id: order.id,
        amount: order.amount,
        total_amount: order.amount,
        tax_amount: 0, // يمكن حسابها لاحقاً
        status: (order.paid_amount || 0) >= order.amount ? 'مدفوعة' : 'قيد الانتظار',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: order.due_date,
        payment_type: order.payment_type,
        notes: order.payment_notes || `فاتورة الطلب ${order.order_number}`
      };

      const { data: newInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single();

      if (invoiceError) {
        console.error('Error creating invoice:', invoiceError);
        toast({
          title: "خطأ",
          description: "حدث خطأ في إنشاء الفاتورة",
          variant: "destructive",
        });
        return false;
      }

      // نسخ بنود الطلب إلى بنود الفاتورة
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (!itemsError && orderItems && orderItems.length > 0) {
        const invoiceItems = orderItems.map(item => ({
          invoice_id: newInvoice.id,
          item_name: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_amount: item.total_amount
        }));

        const { error: insertItemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems);

        if (insertItemsError) {
          console.error('Error inserting invoice items:', insertItemsError);
          // حذف الفاتورة إذا فشلت إضافة البنود
          await supabase.from('invoices').delete().eq('id', newInvoice.id);
          toast({
            title: "خطأ",
            description: "حدث خطأ في إضافة بنود الفاتورة",
            variant: "destructive",
          });
          return false;
        }
      }

      toast({
        title: "تم إنشاء الفاتورة",
        description: `تم إنشاء الفاتورة رقم ${invoiceNumber} بنجاح`,
      });

      return true;
    } catch (error) {
      console.error('Error converting to invoice:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
      return false;
    }
  };

  // جلب البيانات من قاعدة البيانات
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // جلب الطلبات مع بيانات العملاء والخدمات
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          customers (name, whatsapp_number, phone),
          services (name)
        `)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
      } else {
        setOrders(ordersData || []);
      }

      // جلب العملاء
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');

      if (customersError) {
        console.error('Error fetching customers:', customersError);
      } else {
        setCustomers(customersData || []);
      }

      // جلب الخدمات
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('id, name, base_price')
        .eq('is_active', true)
        .order('name');

      if (servicesError) {
        console.error('Error fetching services:', servicesError);
      } else {
        setServices(servicesData || []);
      }

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في جلب البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // تحميل البيانات عند تحميل الصفحة
  useEffect(() => {
    fetchData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "مكتمل":
        return "bg-success/10 text-success border-success/20";
      case "قيد التنفيذ":
        return "bg-primary/10 text-primary border-primary/20";
      case "قيد المراجعة":
        return "bg-warning/10 text-warning border-warning/20";
      case "جديد":
        return "bg-accent/10 text-accent border-accent/20";
      case "معلق":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted/50 text-muted-foreground border-border";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "عالية":
        return "bg-destructive/10 text-destructive";
      case "متوسطة":
        return "bg-warning/10 text-warning-foreground";
      case "منخفضة":
        return "bg-success/10 text-success";
      default:
        return "bg-muted/50 text-muted-foreground";
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.service_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleAddOrder = async () => {
    if (!newOrder.customer_id || !newOrder.service_name) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    // التحقق من وجود بنود صحيحة
    const validItems = orderItems.filter(item => item.item_name.trim() && item.quantity > 0);
    if (validItems.length === 0) {
      toast({
        title: "خطأ",
        description: "يرجى إضافة بند واحد على الأقل",
        variant: "destructive",
      });
      return;
    }

    try {
      // استخدام الدالة لتوليد رقم الطلب
      const { data: orderNumber, error: numberError } = await supabase
        .rpc('generate_order_number');

      if (numberError) {
        console.error('Error generating order number:', numberError);
        return;
      }

      // حساب المبلغ الإجمالي من البنود
      const totalAmount = validItems.reduce((sum, item) => sum + item.total_amount, 0);

      // إضافة الطلب
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: newOrder.customer_id,
          service_id: newOrder.service_id,
          service_name: newOrder.service_name,
          description: newOrder.description,
          due_date: newOrder.due_date,
          amount: totalAmount,
          priority: newOrder.priority,
          status: 'جديد',
          paid_amount: newOrder.paid_amount ? parseFloat(newOrder.paid_amount) : 0,
          payment_type: newOrder.payment_type,
          payment_notes: newOrder.payment_notes
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error adding order:', orderError);
        toast({
          title: "خطأ",
          description: "حدث خطأ في إضافة الطلب",
          variant: "destructive",
        });
        return;
      }

      // إضافة بنود الطلب
      const orderItemsData = validItems.map(item => ({
        order_id: orderData.id,
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_amount: item.total_amount
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) {
        console.error('Error adding order items:', itemsError);
        // حذف الطلب إذا فشلت إضافة البنود
        await supabase.from('orders').delete().eq('id', orderData.id);
        toast({
          title: "خطأ",
          description: "حدث خطأ في إضافة بنود الطلب",
          variant: "destructive",
        });
        return;
      }

      await fetchData();
      setNewOrder({ 
        customer_id: "", 
        service_id: "", 
        service_name: "", 
        description: "", 
        due_date: "", 
        amount: "", 
        priority: "متوسطة",
        paid_amount: "",
        remaining_amount: "",
        payment_type: "دفع آجل",
        payment_notes: "",
        attachment_files: []
      });
      resetOrderItems();
      setIsAddDialogOpen(false);
      
      toast({
        title: "تم إضافة الطلب",
        description: "تم إضافة الطلب بنجاح",
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleEditOrder = (order) => {
    setEditingOrder(order);
    const paidAmount = parseFloat(order.paid_amount?.toString() || "0");
    const totalAmount = parseFloat(order.amount.toString());
    const remainingAmount = totalAmount - paidAmount;
    
    setNewOrder({
      customer_id: order.customer_id,
      service_id: order.service_id,
      service_name: order.service_name,
      description: order.description,
      due_date: order.due_date,
      amount: order.amount.toString(),
      priority: order.priority,
      paid_amount: order.paid_amount?.toString() || "",
      remaining_amount: remainingAmount.toString(),
      payment_type: order.payment_type || "دفع آجل",
      payment_notes: order.payment_notes || "",
      attachment_files: order.attachment_urls || []
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateOrder = async () => {
    if (!newOrder.customer_id || !newOrder.service_name || !newOrder.amount) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          customer_id: newOrder.customer_id,
          service_id: newOrder.service_id,
          service_name: newOrder.service_name,
          description: newOrder.description,
          due_date: newOrder.due_date,
          amount: parseFloat(newOrder.amount),
          priority: newOrder.priority,
          paid_amount: newOrder.paid_amount ? parseFloat(newOrder.paid_amount) : 0,
          payment_type: newOrder.payment_type,
          payment_notes: newOrder.payment_notes
        })
        .eq('id', editingOrder.id);

      if (error) {
        console.error('Error updating order:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في تحديث الطلب",
          variant: "destructive",
        });
        return;
      }

      await fetchData();
      setNewOrder({ 
        customer_id: "", 
        service_id: "", 
        service_name: "", 
        description: "", 
        due_date: "", 
        amount: "", 
        priority: "متوسطة",
        paid_amount: "",
        remaining_amount: "",
        payment_type: "دفع آجل",
        payment_notes: "",
        attachment_files: []
      });
      setIsEditDialogOpen(false);
      setEditingOrder(null);
      
      toast({
        title: "تم تحديث الطلب",
        description: "تم تحديث الطلب بنجاح",
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // تغيير حالة الطلب
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order status:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في تحديث حالة الطلب",
          variant: "destructive",
        });
        return;
      }

      // تحديث الحالة محلياً دون إعادة تحميل البيانات
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus }
            : order
        )
      );

      toast({
        title: "تم تحديث الحالة",
        description: `تم تغيير حالة الطلب إلى "${newStatus}"`,
      });

      // إرسال إشعار واتساب عند تغيير الحالة
      try {
        // الحصول على بيانات الطلب والعميل
        const currentOrder = orders.find(o => o.id === orderId);
        console.log('Current order found:', currentOrder);
        
        if (currentOrder && currentOrder.customers) {
          console.log('Customer data:', currentOrder.customers);
          
          // تحديد نوع الإشعار بناءً على الحالة الجديدة
          let notificationType;
          switch (newStatus) {
            case 'قيد التنفيذ':
              notificationType = 'order_in_progress';
              break;
            case 'مكتمل':
              notificationType = 'order_completed';
              break;
            case 'جديد':
              notificationType = 'order_confirmed';
              break;
            default:
              notificationType = null;
          }

          console.log('Notification type:', notificationType);

          if (notificationType) {
            console.log('Sending notification with data:', {
              type: notificationType,
              data: {
                order_number: currentOrder.order_number,
                customer_name: currentOrder.customers.name,
                customer_phone: currentOrder.customers?.whatsapp_number || currentOrder.customers?.phone,
                amount: currentOrder.amount,
                progress: currentOrder.progress || 0
              }
            });
            
            const result = await supabase.functions.invoke('send-order-notifications', {
              body: {
                type: notificationType,
                data: {
                  order_number: currentOrder.order_number,
                  customer_name: currentOrder.customers.name,
                  customer_phone: currentOrder.customers?.whatsapp_number || currentOrder.customers?.phone,
                  amount: currentOrder.amount,
                  progress: currentOrder.progress || 0
                }
              }
            });
            
            console.log('Notification result:', result);
          } else {
            console.log('No notification type for status:', newStatus);
          }
        } else {
          console.log('No order or customer data found');
        }
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        // لا نريد إظهار خطأ للمستخدم هنا لأن العملية الأساسية نجحت
      }

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري تحميل الطلبات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* العنوان والفلاتر */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-primary" />
            إدارة الطلبات
          </h1>
          <p className="text-muted-foreground mt-1">
            متابعة وإدارة جميع طلبات العملاء
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث في الطلبات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="حالة الطلب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="جديد">جديد</SelectItem>
              <SelectItem value="قيد التنفيذ">قيد التنفيذ</SelectItem>
              <SelectItem value="قيد المراجعة">قيد المراجعة</SelectItem>
              <SelectItem value="مكتمل">مكتمل</SelectItem>
              <SelectItem value="معلق">معلق</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" className="gap-2">
                <Plus className="h-4 w-4" />
                طلب جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>إنشاء طلب جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* معلومات أساسية */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="customer">العميل</Label>
                    <CustomerSearchSelect
                      customers={customers}
                      value={newOrder.customer_id}
                      onValueChange={(value) => setNewOrder({ ...newOrder, customer_id: value })}
                      placeholder="ابحث واختر العميل..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="service">نوع الخدمة</Label>
                    <Select value={newOrder.service_id} onValueChange={(value) => {
                      const selectedService = services.find(s => s.id === value);
                      setNewOrder({ 
                        ...newOrder, 
                        service_id: value, 
                        service_name: selectedService?.name || ""
                      });
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع الخدمة" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">الأولوية</Label>
                    <Select value={newOrder.priority} onValueChange={(value) => setNewOrder({ ...newOrder, priority: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الأولوية" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="عالية">عالية</SelectItem>
                        <SelectItem value="متوسطة">متوسطة</SelectItem>
                        <SelectItem value="منخفضة">منخفضة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dueDate">تاريخ التسليم</Label>
                    <Input 
                      id="dueDate" 
                      type="date" 
                      value={newOrder.due_date}
                      onChange={(e) => setNewOrder({ ...newOrder, due_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">وصف الطلب</Label>
                    <Textarea 
                      id="description" 
                      value={newOrder.description}
                      onChange={(e) => setNewOrder({ ...newOrder, description: e.target.value })}
                      placeholder="تفاصيل الطلب..." 
                      className="min-h-[80px]"
                    />
                  </div>
                </div>

                {/* بنود الطلب */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      بنود الطلب
                    </h3>
                    <Button variant="outline" size="sm" onClick={addOrderItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      إضافة بند
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {orderItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-1 lg:grid-cols-6 gap-3 p-4 border rounded-lg">
                        <div className="lg:col-span-2">
                          <Label htmlFor={`item-name-${index}`}>اسم البند</Label>
                          <Input
                            id={`item-name-${index}`}
                            value={item.item_name}
                            onChange={(e) => updateOrderItem(index, 'item_name', e.target.value)}
                            placeholder="اسم البند..."
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`quantity-${index}`}>الكمية</Label>
                          <Input
                            id={`quantity-${index}`}
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateOrderItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`unit-price-${index}`}>السعر المفرد</Label>
                          <Input
                            id={`unit-price-${index}`}
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateOrderItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`total-${index}`}>الإجمالي</Label>
                          <Input
                            id={`total-${index}`}
                            value={`${item.total_amount.toFixed(2)} ر.س`}
                            readOnly
                            className="bg-muted"
                          />
                        </div>
                        
                        <div className="flex items-end">
                          {orderItems.length > 1 && (
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => removeOrderItem(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* إجمالي المبلغ */}
                  <div className="flex justify-end p-4 bg-muted/50 rounded-lg">
                    <div className="text-lg font-semibold">
                      إجمالي المبلغ: {orderItems.reduce((sum, item) => sum + item.total_amount, 0).toFixed(2)} ر.س
                    </div>
                  </div>
                </div>

                {/* معلومات الدفع */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    معلومات الدفع
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="paidAmount">المبلغ المدفوع (اختياري)</Label>
                      <Input 
                        id="paidAmount" 
                        type="number"
                        step="0.01"
                        value={newOrder.paid_amount}
                        onChange={(e) => {
                          const paid = parseFloat(e.target.value) || 0;
                          const total = parseFloat(newOrder.amount) || 0;
                          const remaining = total - paid;
                          setNewOrder({ 
                            ...newOrder, 
                            paid_amount: e.target.value,
                            remaining_amount: remaining.toString()
                          });
                        }}
                        placeholder="0.00" 
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="remainingAmount">المبلغ المتبقي</Label>
                      <Input 
                        id="remainingAmount" 
                        type="number"
                        step="0.01"
                        value={newOrder.remaining_amount}
                        onChange={(e) => setNewOrder({ ...newOrder, remaining_amount: e.target.value })}
                        placeholder="يحسب تلقائياً" 
                        className="bg-muted"
                        readOnly
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="paymentType">نوع الدفع</Label>
                      <Select value={newOrder.payment_type} onValueChange={(value) => setNewOrder({ ...newOrder, payment_type: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع الدفع" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="كاش">كاش</SelectItem>
                          <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
                          <SelectItem value="شبكة">شبكة</SelectItem>
                          <SelectItem value="دفع آجل">دفع آجل</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="paymentNotes">ملاحظات الدفع</Label>
                      <Textarea 
                        id="paymentNotes" 
                        value={newOrder.payment_notes}
                        onChange={(e) => setNewOrder({ ...newOrder, payment_notes: e.target.value })}
                        placeholder="ملاحظات الدفع..." 
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>
                  
                  {/* عرض ملخص المبالغ */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">إجمالي المبلغ</p>
                      <p className="text-lg font-semibold">{parseFloat(newOrder.amount || '0').toFixed(2)} ر.س</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">المبلغ المدفوع</p>
                      <p className="text-lg font-semibold text-success">{parseFloat(newOrder.paid_amount || '0').toFixed(2)} ر.س</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">المبلغ المتبقي</p>
                      <p className="text-lg font-semibold text-warning">{(parseFloat(newOrder.amount || '0') - parseFloat(newOrder.paid_amount || '0')).toFixed(2)} ر.س</p>
                    </div>
                  </div>
                </div>

                {/* المرفقات */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    المرفقات (اختياري)
                  </h3>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">اسحب وأفلت الملفات هنا أو</p>
                    <Button variant="outline" size="sm">
                      اختر الملفات
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">الحد الأقصى: 10 ميجابايت لكل ملف</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="hero" 
                    className="flex-1"
                    onClick={handleAddOrder}
                  >
                    إنشاء الطلب
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Order Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>تعديل الطلب</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-customer">العميل</Label>
                  <CustomerSearchSelect
                    customers={customers}
                    value={newOrder.customer_id}
                    onValueChange={(value) => setNewOrder({ ...newOrder, customer_id: value })}
                    placeholder="ابحث واختر العميل..."
                  />
                </div>
                <div>
                  <Label htmlFor="edit-service">نوع الخدمة</Label>
                  <Select value={newOrder.service_id} onValueChange={(value) => {
                    const selectedService = services.find(s => s.id === value);
                    setNewOrder({ 
                      ...newOrder, 
                      service_id: value, 
                      service_name: selectedService?.name || ""
                    });
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الخدمة" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-description">وصف الطلب</Label>
                  <Textarea 
                    id="edit-description" 
                    value={newOrder.description}
                    onChange={(e) => setNewOrder({ ...newOrder, description: e.target.value })}
                    placeholder="تفاصيل الطلب..." 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-dueDate">تاريخ التسليم</Label>
                    <Input 
                      id="edit-dueDate" 
                      type="date" 
                      value={newOrder.due_date}
                      onChange={(e) => setNewOrder({ ...newOrder, due_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-amount">المبلغ</Label>
                    <Input 
                      id="edit-amount" 
                      value={newOrder.amount}
                      onChange={(e) => setNewOrder({ ...newOrder, amount: e.target.value })}
                      placeholder="0.00 ر.س" 
                    />
                  </div>
                </div>
                 <div>
                   <Label htmlFor="edit-priority">الأولوية</Label>
                   <Select value={newOrder.priority} onValueChange={(value) => setNewOrder({ ...newOrder, priority: value })}>
                     <SelectTrigger>
                       <SelectValue placeholder="اختر الأولوية" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="عالية">عالية</SelectItem>
                       <SelectItem value="متوسطة">متوسطة</SelectItem>
                       <SelectItem value="منخفضة">منخفضة</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 
                 {/* Payment Information in Edit */}
                 <div className="space-y-4 border-t pt-4">
                   <h3 className="font-medium flex items-center gap-2">
                     <CreditCard className="h-4 w-4" />
                     معلومات الدفع
                   </h3>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <Label htmlFor="edit-paidAmount">المبلغ المدفوع</Label>
                       <Input 
                         id="edit-paidAmount" 
                         value={newOrder.paid_amount}
                         onChange={(e) => setNewOrder({ ...newOrder, paid_amount: e.target.value })}
                         placeholder="0.00 ر.س" 
                       />
                     </div>
                     <div>
                       <Label htmlFor="edit-paymentType">نوع الدفع</Label>
                       <Select value={newOrder.payment_type} onValueChange={(value) => setNewOrder({ ...newOrder, payment_type: value })}>
                         <SelectTrigger>
                           <SelectValue placeholder="اختر نوع الدفع" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="كاش">كاش</SelectItem>
                           <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
                           <SelectItem value="شبكة">شبكة</SelectItem>
                           <SelectItem value="دفع آجل">دفع آجل</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                   </div>
                   <div>
                     <Label htmlFor="edit-paymentNotes">ملاحظات الدفع</Label>
                     <Textarea 
                       id="edit-paymentNotes" 
                       value={newOrder.payment_notes}
                       onChange={(e) => setNewOrder({ ...newOrder, payment_notes: e.target.value })}
                       placeholder="ملاحظات الدفع..." 
                     />
                   </div>
                 </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="hero" 
                    className="flex-1"
                    onClick={handleUpdateOrder}
                  >
                    تحديث الطلب
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
                <p className="text-xl font-bold">{orders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-accent/10 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">جديد</p>
                <p className="text-xl font-bold">{orders.filter(o => o.status === 'جديد').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-warning/10 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">قيد التنفيذ</p>
                <p className="text-xl font-bold">{orders.filter(o => o.status === 'قيد التنفيذ').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-success/10 p-2 rounded-lg">
                <ClipboardList className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">مكتمل</p>
                <p className="text-xl font-bold">{orders.filter(o => o.status === 'مكتمل').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-destructive/10 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">متأخر</p>
                <p className="text-xl font-bold">{orders.filter(o => o.status === 'معلق').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* جدول الطلبات */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الطلبات</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                 <TableHead>رقم الطلب</TableHead>
                 <TableHead>العميل</TableHead>
                 <TableHead>الخدمة</TableHead>
                 <TableHead>الحالة</TableHead>
                 <TableHead>الأولوية</TableHead>
                 <TableHead>التقدم</TableHead>
                 <TableHead>تاريخ التسليم</TableHead>
                 <TableHead>المبلغ</TableHead>
                 <TableHead>الدفع</TableHead>
                 <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.order_number || order.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {order.customers?.name || 'غير محدد'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.service_name || order.services?.name || 'غير محدد'}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.description ? order.description.substring(0, 40) + '...' : 'لا يوجد وصف'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select value={order.status} onValueChange={(newStatus) => handleStatusChange(order.id, newStatus)}>
                      <SelectTrigger className="w-32 h-8 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border shadow-md z-50">
                        <SelectValue>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border shadow-md z-50">
                        <SelectItem value="جديد">
                          <Badge className={getStatusColor("جديد")}>جديد</Badge>
                        </SelectItem>
                        <SelectItem value="قيد التنفيذ">
                          <Badge className={getStatusColor("قيد التنفيذ")}>قيد التنفيذ</Badge>
                        </SelectItem>
                        <SelectItem value="قيد المراجعة">
                          <Badge className={getStatusColor("قيد المراجعة")}>قيد المراجعة</Badge>
                        </SelectItem>
                        <SelectItem value="مكتمل">
                          <Badge className={getStatusColor("مكتمل")}>مكتمل</Badge>
                        </SelectItem>
                        <SelectItem value="معلق">
                          <Badge className={getStatusColor("معلق")}>معلق</Badge>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getPriorityColor(order.priority)}>
                      {order.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${order.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {order.progress || 0}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {order.due_date ? new Date(order.due_date).toLocaleDateString('ar-SA') : 'غير محدد'}
                    </div>
                  </TableCell>
                   <TableCell>
                     <div className="flex items-center gap-1">
                       <DollarSign className="h-3 w-3" />
                       {order.amount ? `${order.amount} ر.س` : 'غير محدد'}
                     </div>
                   </TableCell>
                   <TableCell>
                     <div className="space-y-1">
                       <div className="flex items-center gap-1 text-sm">
                         <CreditCard className="h-3 w-3" />
                         <span className="text-success">
                           {order.paid_amount ? `${order.paid_amount} ر.س` : '0 ر.س'}
                         </span>
                       </div>
                       <div className="text-xs text-muted-foreground">
                         {order.payment_type || 'دفع آجل'}
                       </div>
                     </div>
                   </TableCell>
                   <TableCell>
                     <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" title="عرض التفاصيل">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEditOrder(order)} title="تعديل">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setSelectedOrderPayments(order);
                          setShowPayments(true);
                        }}
                        title="إدارة المدفوعات"
                      >
                        <CreditCard className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => convertToInvoice(order.id)}
                        title="تحويل إلى فاتورة"
                      >
                        <Receipt className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="إرسال رسالة">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* نافذة إدارة المدفوعات */}
      <Dialog open={showPayments} onOpenChange={setShowPayments}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إدارة مدفوعات الطلب {selectedOrderPayments?.order_number}</DialogTitle>
          </DialogHeader>
          
          {selectedOrderPayments && (
            <PaymentManagement 
              order={selectedOrderPayments}
              onPaymentAdded={() => {
                fetchData();
                setShowPayments(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// مكون إدارة المدفوعات
const PaymentManagement = ({ order, onPaymentAdded }) => {
  const [payments, setPayments] = useState([]);
  const [newPayment, setNewPayment] = useState({
    amount: "",
    payment_type: "كاش",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, [order.id]);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', order.id)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const addPayment = async () => {
    if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال مبلغ صحيح",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(newPayment.amount);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingAmount = order.amount - totalPaid;

    if (amount > remainingAmount) {
      toast({
        title: "خطأ",
        description: `المبلغ أكبر من المبلغ المتبقي (${remainingAmount.toFixed(2)} ر.س)`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // إضافة الدفعة
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: order.id,
          amount: amount,
          payment_type: newPayment.payment_type,
          notes: newPayment.notes
        });

      if (paymentError) throw paymentError;

      // تحديث المبلغ المدفوع في الطلب
      const newTotalPaid = totalPaid + amount;
      const { error: orderError } = await supabase
        .from('orders')
        .update({ paid_amount: newTotalPaid })
        .eq('id', order.id);

      if (orderError) throw orderError;

      toast({
        title: "تم إضافة الدفعة",
        description: "تم إضافة الدفعة بنجاح",
      });

      setNewPayment({ amount: "", payment_type: "كاش", notes: "" });
      fetchPayments();
      onPaymentAdded();
    } catch (error) {
      console.error('Error adding payment:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في إضافة الدفعة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingAmount = order.amount - totalPaid;

  return (
    <div className="space-y-6">
      {/* ملخص المبالغ */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">إجمالي المبلغ</p>
          <p className="text-2xl font-bold">{order.amount.toFixed(2)} ر.س</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">المبلغ المدفوع</p>
          <p className="text-2xl font-bold text-success">{totalPaid.toFixed(2)} ر.س</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">المبلغ المتبقي</p>
          <p className="text-2xl font-bold text-warning">{remainingAmount.toFixed(2)} ر.س</p>
        </div>
      </div>

      {/* إضافة دفعة جديدة */}
      <Card>
        <CardHeader>
          <CardTitle>إضافة دفعة جديدة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="payment-amount">المبلغ</Label>
              <Input 
                id="payment-amount"
                type="number"
                step="0.01"
                value={newPayment.amount}
                onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                placeholder="0.00"
                max={remainingAmount}
              />
            </div>
            <div>
              <Label htmlFor="payment-type">نوع الدفع</Label>
              <Select value={newPayment.payment_type} onValueChange={(value) => setNewPayment({ ...newPayment, payment_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="كاش">كاش</SelectItem>
                  <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
                  <SelectItem value="شبكة">شبكة</SelectItem>
                  <SelectItem value="دفع آجل">دفع آجل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="payment-notes">ملاحظات</Label>
              <Input 
                id="payment-notes"
                value={newPayment.notes}
                onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                placeholder="ملاحظات الدفعة..."
              />
            </div>
          </div>
          <Button onClick={addPayment} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            إضافة الدفعة
          </Button>
        </CardContent>
      </Card>

      {/* سجل المدفوعات */}
      <Card>
        <CardHeader>
          <CardTitle>سجل المدفوعات</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>نوع الدفع</TableHead>
                  <TableHead>ملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {new Date(payment.payment_date).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell className="font-medium text-success">
                      {payment.amount.toFixed(2)} ر.س
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.payment_type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد مدفوعات لهذا الطلب</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Orders;