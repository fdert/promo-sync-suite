import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, Printer, Search, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, startOfDay, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface FinancialMovement {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  amount: number;
  calculated_paid_amount: number;
  remaining_amount: number;
  payment_status: string;
  created_at: string;
  service_name: string;
}

const EmployeeFinancialMovements = () => {
  const [movements, setMovements] = useState<FinancialMovement[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<FinancialMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [customDateFrom, setCustomDateFrom] = useState<Date>();
  const [customDateTo, setCustomDateTo] = useState<Date>();

  // إحصائيات
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalRemaining: 0,
    paidOrdersCount: 0,
    unpaidOrdersCount: 0
  });

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('order_payment_summary')
        .select(`
          id,
          order_number,
          amount,
          calculated_paid_amount,
          remaining_amount,
          created_at,
          service_name,
          customer_id
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // جلب أسماء وأرقام العملاء
      const customerIds = [...new Set(data?.map(item => item.customer_id).filter(Boolean))];
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name, phone')
        .in('id', customerIds);

      const customersMap = new Map(customers?.map(c => [c.id, c]) || []);

      const processedData = data?.map(item => {
        const customer = customersMap.get(item.customer_id);
        const paidAmount = item.calculated_paid_amount || 0;
        const totalAmount = item.amount || 0;
        const remainingAmount = totalAmount - paidAmount;
        
        let paymentStatus = 'غير مدفوع';
        if (paidAmount >= totalAmount) {
          paymentStatus = 'مدفوع بالكامل';
        } else if (paidAmount > 0) {
          paymentStatus = 'مدفوع جزئياً';
        }

        return {
          id: item.id,
          order_number: item.order_number || '',
          customer_name: customer?.name || 'غير محدد',
          customer_phone: customer?.phone || '',
          amount: totalAmount,
          calculated_paid_amount: paidAmount,
          remaining_amount: remainingAmount,
          payment_status: paymentStatus,
          created_at: item.created_at,
          service_name: item.service_name || ''
        };
      }) || [];

      setMovements(processedData);
      updateStats(processedData);
    } catch (error) {
      console.error('Error fetching movements:', error);
      toast.error('حدث خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (data: FinancialMovement[]) => {
    const totalOrders = data.length;
    const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
    const totalPaid = data.reduce((sum, item) => sum + item.calculated_paid_amount, 0);
    const totalRemaining = data.reduce((sum, item) => sum + item.remaining_amount, 0);
    const paidOrdersCount = data.filter(item => item.payment_status === 'مدفوع بالكامل').length;
    const unpaidOrdersCount = data.filter(item => item.remaining_amount > 0).length;

    setStats({
      totalOrders,
      totalAmount,
      totalPaid,
      totalRemaining,
      paidOrdersCount,
      unpaidOrdersCount
    });
  };

  const applyFilters = () => {
    let filtered = movements;

    // فلترة البحث
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customer_phone.includes(searchTerm) ||
        item.order_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // فلترة التاريخ
    if (filterPeriod !== "all") {
      const now = new Date();
      let fromDate: Date, toDate: Date;

      switch (filterPeriod) {
        case "today":
          fromDate = startOfDay(now);
          toDate = endOfDay(now);
          break;
        case "month":
          fromDate = startOfMonth(now);
          toDate = endOfMonth(now);
          break;
        case "lastMonth":
          const lastMonth = subMonths(now, 1);
          fromDate = startOfMonth(lastMonth);
          toDate = endOfMonth(lastMonth);
          break;
        case "year":
          fromDate = startOfYear(now);
          toDate = endOfYear(now);
          break;
        case "custom":
          if (customDateFrom && customDateTo) {
            fromDate = startOfDay(customDateFrom);
            toDate = endOfDay(customDateTo);
          } else {
            fromDate = new Date(0);
            toDate = now;
          }
          break;
        default:
          fromDate = new Date(0);
          toDate = now;
      }

      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate >= fromDate && itemDate <= toDate;
      });
    }

    setFilteredMovements(filtered);
    updateStats(filtered);
  };

  useEffect(() => {
    fetchMovements();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterPeriod, customDateFrom, customDateTo, movements]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const exportToExcel = () => {
    const exportData = filteredMovements.map(item => ({
      'رقم الطلب': item.order_number,
      'اسم العميل': item.customer_name,
      'رقم الجوال': item.customer_phone,
      'اسم الخدمة': item.service_name,
      'المبلغ الإجمالي': item.amount,
      'المبلغ المدفوع': item.calculated_paid_amount,
      'المبلغ المتبقي': item.remaining_amount,
      'حالة الدفع': item.payment_status,
      'تاريخ الإنشاء': format(new Date(item.created_at), 'yyyy-MM-dd', { locale: ar })
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الحركة المالية للطلبات');
    
    // ضبط عرض الأعمدة
    const columnWidths = [
      { wch: 15 }, // رقم الطلب
      { wch: 20 }, // اسم العميل
      { wch: 15 }, // رقم الجوال
      { wch: 25 }, // اسم الخدمة
      { wch: 15 }, // المبلغ الإجمالي
      { wch: 15 }, // المبلغ المدفوع
      { wch: 15 }, // المبلغ المتبقي
      { wch: 15 }, // حالة الدفع
      { wch: 15 }  // تاريخ الإنشاء
    ];
    ws['!cols'] = columnWidths;

    XLSX.writeFile(wb, `الحركة-المالية-للطلبات-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('تم تصدير التقرير بنجاح');
  };

  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>الحركة المالية للطلبات</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
          .stat-card { border: 1px solid #ddd; padding: 15px; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
          th { background-color: #f5f5f5; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>الحركة المالية للطلبات</h1>
          <p>تاريخ التقرير: ${format(new Date(), 'yyyy-MM-dd', { locale: ar })}</p>
        </div>
        
        <div class="stats">
          <div class="stat-card">
            <h3>إجمالي الطلبات</h3>
            <p>${stats.totalOrders}</p>
          </div>
          <div class="stat-card">
            <h3>إجمالي المبالغ</h3>
            <p>${formatCurrency(stats.totalAmount)}</p>
          </div>
          <div class="stat-card">
            <h3>إجمالي المدفوع</h3>
            <p>${formatCurrency(stats.totalPaid)}</p>
          </div>
          <div class="stat-card">
            <h3>إجمالي المتبقي</h3>
            <p>${formatCurrency(stats.totalRemaining)}</p>
          </div>
          <div class="stat-card">
            <h3>الطلبات المدفوعة</h3>
            <p>${stats.paidOrdersCount}</p>
          </div>
          <div class="stat-card">
            <h3>الطلبات غير المدفوعة</h3>
            <p>${stats.unpaidOrdersCount}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>رقم الطلب</th>
              <th>اسم العميل</th>
              <th>رقم الجوال</th>
              <th>المبلغ الإجمالي</th>
              <th>المبلغ المدفوع</th>
              <th>المبلغ المتبقي</th>
              <th>حالة الدفع</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            ${filteredMovements.map(item => `
              <tr>
                <td>${item.order_number}</td>
                <td>${item.customer_name}</td>
                <td>${item.customer_phone}</td>
                <td>${formatCurrency(item.amount)}</td>
                <td>${formatCurrency(item.calculated_paid_amount)}</td>
                <td>${formatCurrency(item.remaining_amount)}</td>
                <td>${item.payment_status}</td>
                <td>${format(new Date(item.created_at), 'yyyy-MM-dd')}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="3">الإجمالي</td>
              <td>${formatCurrency(stats.totalAmount)}</td>
              <td>${formatCurrency(stats.totalPaid)}</td>
              <td>${formatCurrency(stats.totalRemaining)}</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'مدفوع بالكامل':
        return 'default';
      case 'مدفوع جزئياً':
        return 'secondary';
      case 'غير مدفوع':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">الحركة المالية للطلبات</h1>
          <p className="text-muted-foreground">تتبع المدفوعات والمبالغ المتبقية للطلبات</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToExcel} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            تصدير Excel
          </Button>
          <Button onClick={printReport} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            طباعة التقرير
          </Button>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبالغ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المدفوع</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalPaid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المتبقي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalRemaining)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">الطلبات المدفوعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paidOrdersCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">الطلبات غير المدفوعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.unpaidOrdersCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* أدوات البحث والفلترة */}
      <Card>
        <CardHeader>
          <CardTitle>البحث والفلترة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث بالاسم أو الجوال أو رقم الطلب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الفترة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفترات</SelectItem>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="month">هذا الشهر</SelectItem>
                <SelectItem value="lastMonth">الشهر الماضي</SelectItem>
                <SelectItem value="year">هذا العام</SelectItem>
                <SelectItem value="custom">فترة مخصصة</SelectItem>
              </SelectContent>
            </Select>

            {filterPeriod === "custom" && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal", !customDateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateFrom ? format(customDateFrom, "PPP", { locale: ar }) : "من تاريخ"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={customDateFrom} onSelect={setCustomDateFrom} initialFocus />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal", !customDateTo && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateTo ? format(customDateTo, "PPP", { locale: ar }) : "إلى تاريخ"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={customDateTo} onSelect={setCustomDateTo} initialFocus />
                  </PopoverContent>
                </Popover>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* جدول البيانات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            تفاصيل الحركة المالية ({filteredMovements.length} طلب)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>اسم العميل</TableHead>
                  <TableHead>رقم الجوال</TableHead>
                  <TableHead>اسم الخدمة</TableHead>
                  <TableHead>المبلغ الإجمالي</TableHead>
                  <TableHead>المبلغ المدفوع</TableHead>
                  <TableHead>المبلغ المتبقي</TableHead>
                  <TableHead>حالة الدفع</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.order_number}</TableCell>
                    <TableCell>{item.customer_name}</TableCell>
                    <TableCell>{item.customer_phone}</TableCell>
                    <TableCell>{item.service_name}</TableCell>
                    <TableCell>{formatCurrency(item.amount)}</TableCell>
                    <TableCell className="text-green-600">{formatCurrency(item.calculated_paid_amount)}</TableCell>
                    <TableCell className={cn("font-medium", item.remaining_amount > 0 ? "text-red-600" : "text-green-600")}>
                      {formatCurrency(item.remaining_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(item.payment_status)}>
                        {item.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(item.created_at), 'yyyy-MM-dd', { locale: ar })}</TableCell>
                  </TableRow>
                ))}
                {filteredMovements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                      لا توجد بيانات لعرضها
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeFinancialMovements;