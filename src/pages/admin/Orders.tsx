import { useState } from "react";
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

const Orders = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const orders = [
    {
      id: "ORD-001",
      customer: "أحمد محمد السالم",
      service: "تصميم شعار",
      description: "تصميم شعار احترافي لشركة تجارية",
      status: "قيد التنفيذ",
      priority: "عالية",
      startDate: "2024-01-15",
      dueDate: "2024-01-25",
      amount: "2,500 ر.س",
      progress: 60,
      assignedTo: "سارة أحمد",
    },
    {
      id: "ORD-002",
      customer: "مؤسسة الأمل",
      service: "حملة إعلانية",
      description: "حملة إعلانية شاملة على وسائل التواصل",
      status: "مكتمل",
      priority: "متوسطة",
      startDate: "2024-01-10",
      dueDate: "2024-01-20",
      amount: "8,500 ر.س",
      progress: 100,
      assignedTo: "محمد علي",
    },
    {
      id: "ORD-003",
      customer: "شركة النجاح",
      service: "موقع إلكتروني",
      description: "تطوير موقع إلكتروني تجاري متكامل",
      status: "قيد المراجعة",
      priority: "عالية",
      startDate: "2024-01-08",
      dueDate: "2024-02-08",
      amount: "15,000 ر.س",
      progress: 85,
      assignedTo: "فاطمة محمد",
    },
    {
      id: "ORD-004",
      customer: "متجر الإلكترونيات",
      service: "هوية بصرية",
      description: "تصميم هوية بصرية متكاملة للمتجر",
      status: "جديد",
      priority: "متوسطة",
      startDate: "2024-01-16",
      dueDate: "2024-01-30",
      amount: "5,200 ر.س",
      progress: 0,
      assignedTo: "غير محدد",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "مكتمل":
        return "bg-green-50 text-green-600 border-green-200";
      case "قيد التنفيذ":
        return "bg-blue-50 text-blue-600 border-blue-200";
      case "قيد المراجعة":
        return "bg-orange-50 text-orange-600 border-orange-200";
      case "جديد":
        return "bg-purple-50 text-purple-600 border-purple-200";
      case "معلق":
        return "bg-red-50 text-red-600 border-red-200";
      default:
        return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "عالية":
        return "bg-red-50 text-red-600";
      case "متوسطة":
        return "bg-yellow-50 text-yellow-600";
      case "منخفضة":
        return "bg-green-50 text-green-600";
      default:
        return "bg-gray-50 text-gray-600";
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.service.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر العميل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ahmed">أحمد محمد السالم</SelectItem>
                      <SelectItem value="fatima">فاطمة علي الأحمد</SelectItem>
                      <SelectItem value="mohammed">محمد عبدالله</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="service">نوع الخدمة</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الخدمة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="logo">تصميم شعار</SelectItem>
                      <SelectItem value="website">موقع إلكتروني</SelectItem>
                      <SelectItem value="campaign">حملة إعلانية</SelectItem>
                      <SelectItem value="branding">هوية بصرية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">وصف الطلب</Label>
                  <Textarea id="description" placeholder="تفاصيل الطلب..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dueDate">تاريخ التسليم</Label>
                    <Input id="dueDate" type="date" />
                  </div>
                  <div>
                    <Label htmlFor="amount">المبلغ</Label>
                    <Input id="amount" placeholder="0.00 ر.س" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="priority">الأولوية</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الأولوية" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">عالية</SelectItem>
                      <SelectItem value="medium">متوسطة</SelectItem>
                      <SelectItem value="low">منخفضة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="hero" 
                    className="flex-1"
                    onClick={() => setIsAddDialogOpen(false)}
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
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg">
                <ClipboardList className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
                <p className="text-xl font-bold">127</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-50 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">جديد</p>
                <p className="text-xl font-bold">8</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-orange-50 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">قيد التنفيذ</p>
                <p className="text-xl font-bold">23</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-50 p-2 rounded-lg">
                <ClipboardList className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">مكتمل</p>
                <p className="text-xl font-bold">86</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-50 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">متأخر</p>
                <p className="text-xl font-bold">3</p>
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
                <TableHead>المسؤول</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {order.customer}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.service}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.description.substring(0, 40)}...
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getPriorityColor(order.priority)}>
                      {order.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${order.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {order.progress}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {order.dueDate}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {order.amount}
                    </div>
                  </TableCell>
                  <TableCell>{order.assignedTo}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
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