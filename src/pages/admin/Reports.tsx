import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Download, TrendingUp, Users, DollarSign, FileText } from "lucide-react";

const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedReport, setSelectedReport] = useState("overview");

  // Mock data for charts
  const monthlyRevenue = [
    { month: "يناير", revenue: 45000, expenses: 25000 },
    { month: "فبراير", revenue: 52000, expenses: 28000 },
    { month: "مارس", revenue: 48000, expenses: 26000 },
    { month: "أبريل", revenue: 61000, expenses: 32000 },
    { month: "مايو", revenue: 55000, expenses: 29000 },
    { month: "يونيو", revenue: 67000, expenses: 35000 },
  ];

  const serviceDistribution = [
    { name: "تطوير المواقع", value: 35, color: "hsl(var(--primary))" },
    { name: "التسويق الرقمي", value: 25, color: "hsl(var(--success))" },
    { name: "الاستشارات", value: 20, color: "hsl(var(--warning))" },
    { name: "التصميم", value: 15, color: "hsl(var(--accent))" },
    { name: "أخرى", value: 5, color: "hsl(var(--secondary))" },
  ];

  const customerGrowth = [
    { month: "يناير", customers: 12 },
    { month: "فبراير", customers: 15 },
    { month: "مارس", customers: 18 },
    { month: "أبريل", customers: 22 },
    { month: "مايو", customers: 28 },
    { month: "يونيو", customers: 32 },
  ];

  const topCustomers = [
    { name: "شركة الرائد للتجارة", revenue: 25000, projects: 3 },
    { name: "مؤسسة النجاح", revenue: 18000, projects: 2 },
    { name: "متجر الأناقة الإلكتروني", revenue: 15000, projects: 4 },
    { name: "شركة الابتكار التقني", revenue: 12000, projects: 2 },
    { name: "مكتب المحاماة المتقدم", revenue: 10000, projects: 1 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">التقارير والإحصائيات</h1>
          <p className="text-muted-foreground">تحليل شامل لأداء الأعمال والإيرادات</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="اختر الفترة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">آخر أسبوع</SelectItem>
              <SelectItem value="month">آخر شهر</SelectItem>
              <SelectItem value="quarter">آخر ربع</SelectItem>
              <SelectItem value="year">آخر سنة</SelectItem>
            </SelectContent>
          </Select>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            تصدير التقرير
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">328,000 ر.س</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-success" />
              +18% من الشهر الماضي
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي العملاء</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">127</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-success" />
              +12 عميل جديد
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المشاريع المكتملة</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">معدل إنجاز 95%</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط قيمة المشروع</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7,289 ر.س</div>
            <p className="text-xs text-muted-foreground">+5% من المتوسط السابق</p>
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
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" name="الإيرادات" />
              <Bar dataKey="expenses" fill="hsl(var(--success))" name="المصروفات" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Service Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>توزيع الخدمات</CardTitle>
            <CardDescription>نسبة الإيرادات حسب نوع الخدمة</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={serviceDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {serviceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Customer Growth */}
        <Card>
          <CardHeader>
            <CardTitle>نمو العملاء</CardTitle>
            <CardDescription>عدد العملاء الجدد شهرياً</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={customerGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="customers" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
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
            {topCustomers.map((customer, index) => (
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
                    {((customer.revenue / 100000) * 100).toFixed(1)}% من الإجمالي
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;