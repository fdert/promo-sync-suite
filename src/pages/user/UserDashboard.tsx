import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  PlusCircle, 
  ClipboardList, 
  Users, 
  DollarSign, 
  FileText,
  Edit,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const UserDashboard = () => {
  const [orders, setOrders] = useState([
    {
      id: 1,
      customer: "شركة الإبداع التقني",
      service: "تصميم موقع إلكتروني",
      status: "in_progress",
      amount: 5000,
      paid: 2500,
      remaining: 2500,
      deadline: "2024-02-15",
      createdAt: "2024-01-10"
    },
    {
      id: 2,
      customer: "مؤسسة النجاح",
      service: "حملة إعلانية",
      status: "completed",
      amount: 3000,
      paid: 3000,
      remaining: 0,
      deadline: "2024-01-30",
      createdAt: "2024-01-05"
    }
  ]);

  const [expenses, setExpenses] = useState([
    {
      id: 1,
      description: "شراء أدوات تصميم",
      amount: 500,
      category: "tools",
      date: "2024-01-15",
      orderId: 1
    }
  ]);

  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { toast } = useToast();

  const orderStatuses = [
    { value: "pending", label: "في الانتظار", color: "bg-warning/10 text-warning-foreground" },
    { value: "in_progress", label: "قيد التنفيذ", color: "bg-blue-100 text-blue-800" },
    { value: "review", label: "مراجعة", color: "bg-purple-100 text-purple-800" },
    { value: "completed", label: "مكتمل", color: "bg-green-100 text-green-800" },
    { value: "cancelled", label: "ملغي", color: "bg-red-100 text-red-800" }
  ];

  const getStatusBadge = (status: string) => {
    const statusInfo = orderStatuses.find(s => s.value === status);
    return (
      <Badge className={statusInfo?.color}>
        {statusInfo?.label || status}
      </Badge>
    );
  };

  const updateOrderStatus = (orderId: number, newStatus: string) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
    
    toast({
      title: "تم تحديث حالة الطلب",
      description: "تم تحديث حالة الطلب بنجاح",
    });
  };

  const addPayment = (orderId: number, amount: number) => {
    setOrders(orders.map(order => 
      order.id === orderId 
        ? { 
            ...order, 
            paid: order.paid + amount,
            remaining: order.remaining - amount
          } 
        : order
    ));
    
    toast({
      title: "تم تسجيل الدفعة",
      description: `تم تسجيل دفعة بقيمة ${amount} ريال`,
    });
  };

  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === "completed").length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.paid, 0);
  const pendingAmount = orders.reduce((sum, order) => sum + order.remaining, 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">لوحة تحكم الموظف</h1>
            <p className="text-muted-foreground">إدارة الطلبات والعملاء والمصروفات</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddOrderOpen} onOpenChange={setIsAddOrderOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  طلب جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>إضافة طلب جديد</DialogTitle>
                  <DialogDescription>أدخل بيانات الطلب الجديد</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم العميل</Label>
                      <Input placeholder="اسم العميل" />
                    </div>
                    <div className="space-y-2">
                      <Label>نوع الخدمة</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الخدمة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="website">تصميم موقع</SelectItem>
                          <SelectItem value="marketing">حملة تسويقية</SelectItem>
                          <SelectItem value="branding">هوية تجارية</SelectItem>
                          <SelectItem value="seo">تحسين محركات البحث</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>وصف المشروع</Label>
                    <Textarea placeholder="وصف تفصيلي للمشروع" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>قيمة المشروع</Label>
                      <Input type="number" placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ التسليم</Label>
                      <Input type="date" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1">حفظ الطلب</Button>
                    <Button variant="outline" className="flex-1" onClick={() => setIsAddOrderOpen(false)}>
                      إلغاء
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  مصروف جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>إضافة مصروف جديد</DialogTitle>
                  <DialogDescription>تسجيل مصروف متعلق بمشروع</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>وصف المصروف</Label>
                    <Input placeholder="وصف المصروف" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>المبلغ</Label>
                      <Input type="number" placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>التاريخ</Label>
                      <Input type="date" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>المشروع المرتبط</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المشروع" />
                      </SelectTrigger>
                      <SelectContent>
                        {orders.map((order) => (
                          <SelectItem key={order.id} value={order.id.toString()}>
                            {order.customer} - {order.service}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1">حفظ المصروف</Button>
                    <Button variant="outline" className="flex-1" onClick={() => setIsAddExpenseOpen(false)}>
                      إلغاء
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الطلبات المكتملة</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedOrders}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الإيرادات المحصلة</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRevenue.toLocaleString()} ريال</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المبالغ المعلقة</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingAmount.toLocaleString()} ريال</div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>الطلبات الحالية</CardTitle>
            <CardDescription>إدارة ومتابعة الطلبات</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العميل</TableHead>
                  <TableHead>الخدمة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>المدفوع</TableHead>
                  <TableHead>المتبقي</TableHead>
                  <TableHead>موعد التسليم</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.customer}</TableCell>
                    <TableCell>{order.service}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{order.amount.toLocaleString()} ريال</TableCell>
                    <TableCell className="text-green-600">{order.paid.toLocaleString()} ريال</TableCell>
                    <TableCell className="text-orange-600">{order.remaining.toLocaleString()} ريال</TableCell>
                    <TableCell>{order.deadline}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Select
                          value={order.status}
                          onValueChange={(value) => updateOrderStatus(order.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {orderStatuses.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {order.remaining > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addPayment(order.id, 1000)}
                          >
                            تحصيل
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserDashboard;