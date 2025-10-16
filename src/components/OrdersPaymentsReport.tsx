import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { FileDown, Calendar, User, Filter, Download } from "lucide-react";
import * as XLSX from "xlsx";

interface OrderPaymentData {
  order_id: string;
  order_number: string;
  customer_name: string;
  created_at: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  created_by_name: string;
  payment_type?: string;
  payment_date?: string;
}

const OrdersPaymentsReport = () => {
  const { toast } = useToast();
  const [data, setData] = useState<OrderPaymentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  
  // Filters
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchUsers();
    fetchData();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: usersData, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');

      if (error) throw error;
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // بناء الاستعلام الأساسي
      let ordersQuery = supabase
        .from('orders')
        .select(`
          id,
          order_number,
          created_at,
          total_amount,
          paid_amount,
          status,
          created_by,
          customer_id
        `)
        .order('created_at', { ascending: false });

      // تطبيق فلتر المستخدم
      if (selectedUserId && selectedUserId !== "all") {
        ordersQuery = ordersQuery.eq('created_by', selectedUserId);
      }

      // تطبيق فلتر التاريخ
      if (startDate) {
        ordersQuery = ordersQuery.gte('created_at', startDate + 'T00:00:00');
      }
      if (endDate) {
        ordersQuery = ordersQuery.lte('created_at', endDate + 'T23:59:59');
      }

      // تطبيق فلتر الشهر
      if (selectedMonth) {
        const [year, month] = selectedMonth.split('-');
        const startOfMonth = `${year}-${month}-01T00:00:00`;
        const endOfMonth = new Date(parseInt(year), parseInt(month), 0);
        const endOfMonthStr = format(endOfMonth, 'yyyy-MM-dd') + 'T23:59:59';
        ordersQuery = ordersQuery.gte('created_at', startOfMonth).lte('created_at', endOfMonthStr);
      }

      // تطبيق فلتر السنة
      if (selectedYear && selectedYear !== "all") {
        const startOfYear = `${selectedYear}-01-01T00:00:00`;
        const endOfYear = `${selectedYear}-12-31T23:59:59`;
        ordersQuery = ordersQuery.gte('created_at', startOfYear).lte('created_at', endOfYear);
      }

      // تطبيق فلتر الحالة
      if (statusFilter && statusFilter !== "all") {
        ordersQuery = ordersQuery.eq('status', statusFilter as any);
      }

      const { data: ordersData, error: ordersError } = await ordersQuery;

      if (ordersError) throw ordersError;

      // جلب بيانات العملاء
      const customerIds = [...new Set((ordersData || []).map((o: any) => o.customer_id).filter(Boolean))];
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, name')
        .in('id', customerIds.length > 0 ? customerIds : ['00000000-0000-0000-0000-000000000000']);

      // جلب بيانات المستخدمين (منشئي الطلبات)
      const creatorIds = [...new Set((ordersData || []).map((o: any) => o.created_by).filter(Boolean))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', creatorIds.length > 0 ? creatorIds : ['00000000-0000-0000-0000-000000000000']);

      // إنشاء خرائط للبحث السريع
      const customersMap = new Map((customersData || []).map((c: any) => [c.id, c.name]));
      const profilesMap = new Map((profilesData || []).map((p: any) => [p.id, p.full_name]));

      // دمج البيانات
      const enrichedData: OrderPaymentData[] = (ordersData || []).map((order: any) => ({
        order_id: order.id,
        order_number: order.order_number,
        customer_name: customersMap.get(order.customer_id) || 'غير محدد',
        created_at: order.created_at,
        total_amount: Number(order.total_amount || 0),
        paid_amount: Number(order.paid_amount || 0),
        remaining_amount: Number(order.total_amount || 0) - Number(order.paid_amount || 0),
        status: order.status,
        created_by_name: profilesMap.get(order.created_by) || 'غير محدد',
      }));

      setData(enrichedData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchData();
  };

  const handleResetFilters = () => {
    setSelectedUserId("all");
    setStartDate("");
    setEndDate("");
    setSelectedMonth("");
    setSelectedYear("all");
    setStatusFilter("all");
  };

  const exportToExcel = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(
        data.map((row) => ({
          'رقم الطلب': row.order_number,
          'اسم العميل': row.customer_name,
          'التاريخ': format(new Date(row.created_at), 'dd/MM/yyyy', { locale: ar }),
          'المبلغ الإجمالي': row.total_amount,
          'المبلغ المدفوع': row.paid_amount,
          'المبلغ المتبقي': row.remaining_amount,
          'الحالة': getStatusText(row.status),
          'منشئ الطلب': row.created_by_name,
        }))
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'تقرير الطلبات والمدفوعات');
      
      const fileName = `تقرير_الطلبات_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "تم التصدير",
        description: "تم تصدير البيانات إلى ملف Excel بنجاح",
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "خطأ",
        description: "فشل في تصدير البيانات",
        variant: "destructive",
      });
    }
  };

  const exportToPDF = async () => {
    try {
      // إنشاء محتوى HTML للطباعة
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('فشل في فتح نافذة الطباعة');
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>تقرير الطلبات والمدفوعات</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              direction: rtl;
              padding: 20px;
            }
            h1 {
              text-align: center;
              color: #333;
              margin-bottom: 30px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: right;
            }
            th {
              background-color: #f4f4f4;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .totals {
              margin-top: 30px;
              padding: 15px;
              background-color: #f0f0f0;
              border-radius: 5px;
            }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>تقرير الطلبات والمدفوعات</h1>
          <p><strong>تاريخ التقرير:</strong> ${format(new Date(), 'dd/MM/yyyy', { locale: ar })}</p>
          
          <table>
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>اسم العميل</th>
                <th>التاريخ</th>
                <th>المبلغ الإجمالي</th>
                <th>المبلغ المدفوع</th>
                <th>المبلغ المتبقي</th>
                <th>الحالة</th>
                <th>منشئ الطلب</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  <td>${row.order_number}</td>
                  <td>${row.customer_name}</td>
                  <td>${format(new Date(row.created_at), 'dd/MM/yyyy', { locale: ar })}</td>
                  <td>${row.total_amount.toFixed(2)} ريال</td>
                  <td>${row.paid_amount.toFixed(2)} ريال</td>
                  <td>${row.remaining_amount.toFixed(2)} ريال</td>
                  <td>${getStatusText(row.status)}</td>
                  <td>${row.created_by_name}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <h3>الإجماليات</h3>
            <p><strong>عدد الطلبات:</strong> ${data.length}</p>
            <p><strong>إجمالي المبالغ:</strong> ${data.reduce((sum, row) => sum + row.total_amount, 0).toFixed(2)} ريال</p>
            <p><strong>إجمالي المدفوعات:</strong> ${data.reduce((sum, row) => sum + row.paid_amount, 0).toFixed(2)} ريال</p>
            <p><strong>إجمالي المتبقي:</strong> ${data.reduce((sum, row) => sum + row.remaining_amount, 0).toFixed(2)} ريال</p>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      toast({
        title: "جاهز للطباعة",
        description: "تم فتح نافذة الطباعة، يمكنك حفظ الملف كـ PDF",
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: "خطأ",
        description: "فشل في تصدير البيانات إلى PDF",
        variant: "destructive",
      });
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'pending': 'قيد الانتظار',
      'processing': 'قيد المعالجة',
      'completed': 'مكتمل',
      'cancelled': 'ملغي',
      'on_hold': 'معلق',
    };
    return statusMap[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'processing': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'on_hold': 'bg-gray-100 text-gray-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusBadge = (paid: number, total: number) => {
    if (paid >= total) {
      return <Badge className="bg-green-100 text-green-800">مدفوع بالكامل</Badge>;
    } else if (paid > 0) {
      return <Badge className="bg-yellow-100 text-yellow-800">مدفوع جزئياً</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">غير مدفوع</Badge>;
    }
  };

  // توليد قائمة السنوات (آخر 5 سنوات)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            الفلاتر
          </CardTitle>
          <CardDescription>
            حدد المعايير لتصفية البيانات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* User Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                المستخدم
              </Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع المستخدمين" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المستخدمين</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>حالة الطلب</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                  <SelectItem value="processing">قيد المعالجة</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                  <SelectItem value="on_hold">معلق</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Year Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                السنة
              </Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر السنة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع السنوات</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month Filter */}
            <div className="space-y-2">
              <Label>الشهر</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label>من تاريخ</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>إلى تاريخ</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleApplyFilters} disabled={loading}>
              <Filter className="h-4 w-4 ml-2" />
              تطبيق الفلاتر
            </Button>
            <Button variant="outline" onClick={handleResetFilters}>
              إعادة تعيين
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export Buttons */}
      <div className="flex gap-2">
        <Button onClick={exportToExcel} variant="outline" disabled={data.length === 0}>
          <FileDown className="h-4 w-4 ml-2" />
          تصدير إلى Excel
        </Button>
        <Button onClick={exportToPDF} variant="outline" disabled={data.length === 0}>
          <Download className="h-4 w-4 ml-2" />
          تصدير إلى PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">عدد الطلبات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">إجمالي المبالغ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.reduce((sum, row) => sum + row.total_amount, 0).toFixed(2)} ريال
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">إجمالي المدفوعات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data.reduce((sum, row) => sum + row.paid_amount, 0).toFixed(2)} ريال
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">إجمالي المتبقي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data.reduce((sum, row) => sum + row.remaining_amount, 0).toFixed(2)} ريال
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>تقرير الطلبات والمدفوعات</CardTitle>
          <CardDescription>
            عرض تفصيلي لجميع الطلبات والمدفوعات
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد بيانات متاحة
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الطلب</TableHead>
                    <TableHead>اسم العميل</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>المبلغ الإجمالي</TableHead>
                    <TableHead>المبلغ المدفوع</TableHead>
                    <TableHead>المبلغ المتبقي</TableHead>
                    <TableHead>حالة الدفع</TableHead>
                    <TableHead>حالة الطلب</TableHead>
                    <TableHead>منشئ الطلب</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.order_id}>
                      <TableCell className="font-medium">{row.order_number}</TableCell>
                      <TableCell>{row.customer_name}</TableCell>
                      <TableCell>
                        {format(new Date(row.created_at), 'dd/MM/yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell>{row.total_amount.toFixed(2)} ريال</TableCell>
                      <TableCell className="text-green-600">
                        {row.paid_amount.toFixed(2)} ريال
                      </TableCell>
                      <TableCell className="text-red-600">
                        {row.remaining_amount.toFixed(2)} ريال
                      </TableCell>
                      <TableCell>
                        {getPaymentStatusBadge(row.paid_amount, row.total_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(row.status)}>
                          {getStatusText(row.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.created_by_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersPaymentsReport;
