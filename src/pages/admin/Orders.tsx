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
    priority: "متوسطة"
  });

  const { toast } = useToast();

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
    if (!newOrder.customer_id || !newOrder.service_name || !newOrder.amount) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
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

      const { error } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: newOrder.customer_id,
          service_id: newOrder.service_id,
          service_name: newOrder.service_name,
          description: newOrder.description,
          due_date: newOrder.due_date,
          amount: parseFloat(newOrder.amount),
          priority: newOrder.priority,
          status: 'جديد'
        });

      if (error) {
        console.error('Error adding order:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في إضافة الطلب",
          variant: "destructive",
        });
        return;
      }

      await fetchData();
      setNewOrder({ customer_id: "", service_id: "", service_name: "", description: "", due_date: "", amount: "", priority: "متوسطة" });
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
    setNewOrder({
      customer_id: order.customer_id,
      service_id: order.service_id,
      service_name: order.service_name,
      description: order.description,
      due_date: order.due_date,
      amount: order.amount.toString(),
      priority: order.priority
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
          priority: newOrder.priority
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
      setNewOrder({ customer_id: "", service_id: "", service_name: "", description: "", due_date: "", amount: "", priority: "متوسطة" });
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
        if (currentOrder && currentOrder.customers) {
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

          if (notificationType) {
            await supabase.functions.invoke('send-order-notifications', {
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
          }
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
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>إنشاء طلب جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
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
                      service_name: selectedService?.name || "",
                      amount: selectedService?.base_price?.toString() || ""
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
                  <Label htmlFor="description">وصف الطلب</Label>
                  <Textarea 
                    id="description" 
                    value={newOrder.description}
                    onChange={(e) => setNewOrder({ ...newOrder, description: e.target.value })}
                    placeholder="تفاصيل الطلب..." 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="amount">المبلغ</Label>
                    <Input 
                      id="amount" 
                      value={newOrder.amount}
                      onChange={(e) => setNewOrder({ ...newOrder, amount: e.target.value })}
                      placeholder="0.00 ر.س" 
                    />
                  </div>
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
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEditOrder(order)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
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
    </div>
  );
};

export default Orders;