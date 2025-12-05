// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, Printer, Search, FileText, TrendingUp, TrendingDown, DollarSign, Users, CheckCircle, XCircle, AlertCircle, Phone, Calendar as CalendarIcon2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, startOfDay, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface FinancialMovement {
  order_id: string;
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
          order_id,
          order_number,
          total_amount,
          paid_amount,
          balance,
          status,
          created_at,
          customer_id,
          customer_name
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // جلب أرقام العملاء
      const customerIds = [...new Set(data?.map(item => item.customer_id).filter(Boolean))];
      const { data: customers } = await supabase
        .from('customers')
        .select('id, phone')
        .in('id', customerIds);

      const customersMap = new Map(customers?.map(c => [c.id, c]) || []);

      const processedData = data?.map(item => {
        const customer = customersMap.get(item.customer_id);
        const paidAmount = Number(item.paid_amount) || 0;
        const totalAmount = Number(item.total_amount) || 0;
        const remainingAmount = Number(item.balance) || 0;
        
        let paymentStatus = 'غير مدفوع';
        if (paidAmount >= totalAmount) {
          paymentStatus = 'مدفوع بالكامل';
        } else if (paidAmount > 0) {
          paymentStatus = 'مدفوع جزئياً';
        }

        return {
          order_id: item.order_id,
          order_number: item.order_number || '',
          customer_name: item.customer_name || 'غير محدد',
          customer_phone: customer?.phone || '',
          amount: totalAmount,
          calculated_paid_amount: paidAmount,
          remaining_amount: remainingAmount,
          payment_status: paymentStatus,
          created_at: item.created_at,
          service_name: ''
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'مدفوع بالكامل':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'مدفوع جزئياً':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'غير مدفوع':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto"></div>
            <div className="absolute inset-0 rounded-full h-12 w-12 border-4 border-transparent border-r-primary/40 animate-[spin_2s_linear_infinite_reverse] mx-auto"></div>
          </div>
          <p className="text-lg font-medium text-muted-foreground">جاري تحميل البيانات المالية...</p>
          <p className="text-sm text-muted-foreground">نرجو الانتظار قليلاً</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8 bg-gradient-to-br from-background to-secondary/20 min-h-screen">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 p-8 border border-border/50">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              الحركة المالية للطلبات
            </h1>
            <p className="text-lg text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              تتبع المدفوعات والمبالغ المتبقية للطلبات
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={exportToExcel} variant="outline" className="gap-2 bg-white/50 hover:bg-white/80 border-primary/20 hover:border-primary transition-all duration-300 shadow-lg hover:shadow-xl">
              <Download className="h-4 w-4" />
              تصدير Excel
            </Button>
            <Button onClick={printReport} variant="outline" className="gap-2 bg-white/50 hover:bg-white/80 border-primary/20 hover:border-primary transition-all duration-300 shadow-lg hover:shadow-xl">
              <Printer className="h-4 w-4" />
              طباعة التقرير
            </Button>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <Card className="border-primary/20 shadow-lg bg-gradient-to-r from-white to-primary/5">
        <CardHeader className="border-b border-primary/10">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Search className="h-6 w-6 text-primary" />
            البحث والفلترة
          </CardTitle>
          <CardDescription>استخدم الأدوات أدناه للبحث وتصفية النتائج</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="relative group">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="البحث بالاسم أو الجوال أو رقم الطلب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-primary/20 focus:border-primary bg-white/80 backdrop-blur-sm"
              />
            </div>
            
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="border-primary/20 focus:border-primary bg-white/80 backdrop-blur-sm">
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
                    <Button variant="outline" className={cn(
                      "justify-start text-left font-normal border-primary/20 hover:border-primary bg-white/80 backdrop-blur-sm",
                      !customDateFrom && "text-muted-foreground"
                    )}>
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
                    <Button variant="outline" className={cn(
                      "justify-start text-left font-normal border-primary/20 hover:border-primary bg-white/80 backdrop-blur-sm",
                      !customDateTo && "text-muted-foreground"
                    )}>
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

      {/* Data Table */}
      <Card className="border-primary/20 shadow-xl bg-gradient-to-br from-white to-secondary/30 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-primary/20">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 rounded-lg bg-primary/20">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            تفاصيل الحركة المالية
            <Badge variant="secondary" className="ml-auto text-lg px-4 py-2 bg-primary/20 text-primary border-primary/30">
              {filteredMovements.length} طلب
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10 border-b-2 border-primary/20">
                  <TableHead className="font-bold text-primary text-center py-4">رقم الطلب</TableHead>
                  <TableHead className="font-bold text-primary text-center py-4">بيانات العميل</TableHead>
                  <TableHead className="font-bold text-primary text-center py-4">الخدمة</TableHead>
                  <TableHead className="font-bold text-primary text-center py-4">المبلغ الإجمالي</TableHead>
                  <TableHead className="font-bold text-primary text-center py-4">المبلغ المدفوع</TableHead>
                  <TableHead className="font-bold text-primary text-center py-4">المبلغ المتبقي</TableHead>
                  <TableHead className="font-bold text-primary text-center py-4">حالة الدفع</TableHead>
                  <TableHead className="font-bold text-primary text-center py-4">التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.map((item, index) => (
                  <TableRow 
                    key={item.id}
                    className={cn(
                      "hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 transition-all duration-300 border-b border-border/50",
                      index % 2 === 0 ? "bg-white" : "bg-secondary/20"
                    )}
                  >
                    <TableCell className="font-bold text-center py-6">
                      <div className="bg-primary/10 rounded-lg px-3 py-2 inline-block">
                        <span className="text-primary font-mono">{item.order_number}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-6">
                      <div className="space-y-2">
                        <div className="font-semibold text-foreground">{item.customer_name}</div>
                        <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span dir="ltr">{item.customer_phone}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-6">
                      <div className="bg-accent/10 rounded-lg px-3 py-2 inline-block max-w-32">
                        <span className="text-accent-foreground font-medium text-sm">{item.service_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-6">
                      <div className="text-lg font-bold text-purple-600">
                        {formatCurrency(item.amount)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-6">
                      <div className="text-lg font-bold text-green-600 bg-green-50 rounded-lg px-3 py-2 inline-block">
                        {formatCurrency(item.calculated_paid_amount)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-6">
                      <div className={cn(
                        "text-lg font-bold rounded-lg px-3 py-2 inline-block",
                        item.remaining_amount > 0 
                          ? "text-red-600 bg-red-50" 
                          : "text-green-600 bg-green-50"
                      )}>
                        {formatCurrency(item.remaining_amount)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-6">
                      <div className="flex items-center justify-center gap-2">
                        {getStatusIcon(item.payment_status)}
                        <Badge variant={getStatusBadgeVariant(item.payment_status)} className="text-sm px-3 py-1">
                          {item.payment_status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-6">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <CalendarIcon2 className="h-4 w-4" />
                        <span>{format(new Date(item.created_at), 'yyyy-MM-dd', { locale: ar })}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMovements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 rounded-full bg-muted/50">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-lg font-medium text-muted-foreground">لا توجد بيانات لعرضها</p>
                          <p className="text-sm text-muted-foreground">جرب تغيير معايير البحث أو الفلترة</p>
                        </div>
                      </div>
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