// @ts-nocheck
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Download, TrendingUp, TrendingDown, Users, DollarSign, FileText, Calendar, Filter, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import OrderDetailedReport from "@/components/OrderDetailedReport";

const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedReport, setSelectedReport] = useState("overview");
  const [activeTab, setActiveTab] = useState("financial");
  const [startDate, setStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({
    totalRevenue: 0,
    totalCustomers: 0,
    completedProjects: 0,
    averageProjectValue: 0,
    monthlyRevenue: [],
    topCustomers: [],
    expenses: []
  });

  const { toast } = useToast();

  // جلب البيانات من قاعدة البيانات
  const fetchReportData = async () => {
    try {
      setLoading(true);

      // جلب مدفوعات الطلبات
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          orders!inner(
            id,
            customer_id,
            status,
            created_at,
            customers(name, id)
          )
        `)
        .gte('payment_date', startDate)
        .lte('payment_date', endDate);

      if (paymentsError) throw paymentsError;

      // جلب المصروفات
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (expensesError) throw expensesError;

      // جلب الطلبات المكتملة
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'مكتمل')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (ordersError) throw ordersError;

      // حساب الإحصائيات
      const totalRevenue = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
      const uniqueCustomers = new Set(payments?.map(payment => payment.orders?.customer_id)).size;
      const completedProjects = orders?.length || 0;
      const averageProjectValue = completedProjects > 0 ? totalRevenue / completedProjects : 0;

      // تجميع البيانات الشهرية
      const monthlyData = {};
      payments?.forEach(payment => {
        const month = new Date(payment.payment_date).toLocaleDateString('ar-SA', { month: 'long' });
        if (!monthlyData[month]) {
          monthlyData[month] = { month, revenue: 0, expenses: 0 };
        }
        monthlyData[month].revenue += payment.amount || 0;
      });

      expenses?.forEach(expense => {
        const month = new Date(expense.created_at).toLocaleDateString('ar-SA', { month: 'long' });
        if (!monthlyData[month]) {
          monthlyData[month] = { month, revenue: 0, expenses: 0 };
        }
        monthlyData[month].expenses += expense.amount || 0;
      });

      // أفضل العملاء
      const customerRevenue = {};
      payments?.forEach(payment => {
        const customerId = payment.orders?.customer_id;
        const customerName = payment.orders?.customers?.name || 'غير محدد';
        if (customerId && !customerRevenue[customerId]) {
          customerRevenue[customerId] = { name: customerName, revenue: 0, projects: 0 };
        }
        if (customerId) {
          customerRevenue[customerId].revenue += payment.amount || 0;
          customerRevenue[customerId].projects += 1;
        }
      });

      const topCustomers = Object.values(customerRevenue)
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 5);

      setReportData({
        totalRevenue,
        totalCustomers: uniqueCustomers,
        completedProjects,
        averageProjectValue,
        monthlyRevenue: Object.values(monthlyData),
        topCustomers,
        expenses: expenses || []
      });

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في جلب بيانات التقرير",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [startDate, endDate]);

  // تصدير التقرير إلى CSV
  const exportToCSV = () => {
    try {
      const csvData = [
        ['التقرير المالي'],
        ['الفترة:', `${startDate} إلى ${endDate}`],
        [''],
        ['الإحصائيات العامة'],
        ['إجمالي الإيرادات', `${reportData.totalRevenue.toLocaleString()} ر.س`],
        ['عدد العملاء', reportData.totalCustomers],
        ['المشاريع المكتملة', reportData.completedProjects],
        ['متوسط قيمة المشروع', `${reportData.averageProjectValue.toLocaleString()} ر.س`],
        [''],
        ['أفضل العملاء'],
        ['اسم العميل', 'الإيرادات', 'عدد المشاريع']
      ];

      reportData.topCustomers.forEach((customer: any) => {
        csvData.push([customer.name, `${customer.revenue.toLocaleString()} ر.س`, customer.projects]);
      });

      const csvContent = "data:text/csv;charset=utf-8," + csvData.map(row => row.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `financial_report_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "نجح التصدير",
        description: "تم تصدير التقرير بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير التقرير",
        variant: "destructive",
      });
    }
  };

  // تصدير إلى PDF
  const exportToPDF = () => {
    try {
      window.print();
      toast({
        title: "طباعة/تصدير PDF",
        description: "تم فتح نافذة الطباعة لحفظ التقرير كـ PDF",
      });
    } catch (error) {
      toast({
        title: "خطأ في الطباعة",
        description: "حدث خطأ أثناء فتح نافذة الطباعة",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري تحميل التقرير...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:bg-white">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-foreground">التقارير والإحصائيات</h1>
          <p className="text-muted-foreground">تحليل شامل لأداء الأعمال والإيرادات</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="financial" className="gap-2">
            <DollarSign className="h-4 w-4" />
            التقرير المالي
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            تقرير الطلبات التفصيلي
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-2 print:hidden">
            <div className="flex gap-2">
              <div>
                <Label htmlFor="start-date" className="text-xs">من تاريخ</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="text-xs">إلى تاريخ</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>
            
            <div className="flex gap-2 items-end">
              <Button onClick={exportToCSV} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                تصدير Excel
              </Button>
              <Button onClick={exportToPDF} className="gap-2">
                <FileText className="h-4 w-4" />
                تصدير PDF
              </Button>
            </div>
          </div>

          <div className="print:block hidden">
            <h1 className="text-2xl font-bold text-center mb-4">التقرير المالي</h1>
            <p className="text-center text-gray-600 mb-6">من {startDate} إلى {endDate}</p>
          </div>

          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.totalRevenue.toLocaleString()} ر.س</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-success" />
                  خلال الفترة المحددة
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي العملاء</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.totalCustomers}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-success" />
                  عملاء نشطون
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">المشاريع المكتملة</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.completedProjects}</div>
                <p className="text-xs text-muted-foreground">خلال الفترة</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">متوسط قيمة المشروع</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.averageProjectValue.toLocaleString()} ر.س</div>
                <p className="text-xs text-muted-foreground">متوسط الإيرادات</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>الإيرادات والمصروفات الشهرية</CardTitle>
              <CardDescription>مقارنة الإيرادات والمصروفات على مدار الأشهر الماضية</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" name="الإيرادات" />
                  <Bar dataKey="expenses" fill="hsl(var(--destructive))" name="المصروفات" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-1">
            {/* Revenue vs Expenses Summary */}
            <Card>
              <CardHeader>
                <CardTitle>ملخص الأداء المالي</CardTitle>
                <CardDescription>مقارنة الإيرادات والمصروفات خلال الفترة المحددة</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-success/5">
                    <div>
                      <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                      <p className="text-2xl font-bold text-success">{reportData.totalRevenue.toLocaleString()} ر.س</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-success" />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-destructive/5">
                    <div>
                      <p className="text-sm text-muted-foreground">إجمالي المصروفات</p>
                      <p className="text-2xl font-bold text-destructive">
                        {reportData.expenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0).toLocaleString()} ر.س
                      </p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-destructive" />
                  </div>
                </div>
                <div className="mt-4 p-4 border rounded-lg bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">صافي الربح</p>
                      <p className="text-2xl font-bold text-primary">
                        {(reportData.totalRevenue - reportData.expenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0)).toLocaleString()} ر.س
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Customers */}
          <Card>
            <CardHeader>
              <CardTitle>أفضل العملاء</CardTitle>
              <CardDescription>العملاء الأكثر إيراداً خلال الفترة المحددة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.topCustomers.map((customer: any, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-medium">{customer.name}</h3>
                        <p className="text-sm text-muted-foreground">{customer.projects} مشاريع</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{customer.revenue.toLocaleString()} ر.س</p>
                      <Badge variant="outline">
                        {reportData.totalRevenue > 0 ? ((customer.revenue / reportData.totalRevenue) * 100).toFixed(1) : 0}% من الإجمالي
                      </Badge>
                    </div>
                  </div>
                ))}
                {reportData.topCustomers.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">لا توجد بيانات عملاء في الفترة المحددة</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <OrderDetailedReport />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;