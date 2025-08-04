import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Users,
  ClipboardList,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  Plus,
  FileText,
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();

  // جلب إحصائيات العملاء
  const { data: customersStats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, created_at, total_spent')
        .eq('status', 'نشط');
      
      if (error) throw error;
      
      const totalCustomers = data.length;
      const thisMonth = new Date();
      thisMonth.setDate(1);
      
      const newThisMonth = data.filter(customer => 
        new Date(customer.created_at) >= thisMonth
      ).length;
      
      const totalSpent = data.reduce((sum, customer) => sum + (customer.total_spent || 0), 0);
      
      return { totalCustomers, newThisMonth, totalSpent };
    }
  });

  // جلب إحصائيات الطلبات
  const { data: ordersStats } = useQuery({
    queryKey: ['orders-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, created_at, status, amount');
      
      if (error) throw error;
      
      const activeOrders = data.filter(order => 
        ['جديد', 'مؤكد', 'قيد التنفيذ', 'قيد المراجعة'].includes(order.status)
      ).length;
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      
      const thisMonthOrders = data.filter(order => 
        new Date(order.created_at) >= thisMonth
      );
      
      // حساب الإيرادات من جميع الطلبات المُنشأة هذا الشهر (لتطابق النظام المحاسبي)
      const monthlyRevenue = thisMonthOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
      
      return { activeOrders, monthlyRevenue, totalOrders: data.length };
    }
  });

  // جلب الطلبات الأخيرة
  const { data: recentOrders } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          service_name,
          status,
          amount,
          created_at,
          customers (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    }
  });

  // جلب الفواتير الأخيرة
  const { data: recentInvoices } = useQuery({
    queryKey: ['recent-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          total_amount,
          status,
          created_at,
          customers (name)
        `)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data;
    }
  });

  // جلب رسائل WhatsApp المعلقة
  const { data: pendingMessages } = useQuery({
    queryKey: ['pending-whatsapp'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .eq('status', 'pending');
      
      if (error) throw error;
      return data.length;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "مكتمل":
        return "text-success bg-success/10";
      case "قيد التنفيذ":
        return "text-primary bg-primary/10";
      case "قيد المراجعة":
        return "text-warning bg-warning/10";
      case "مدفوع":
        return "text-success bg-success/10";
      case "قيد الانتظار":
        return "text-warning bg-warning/10";
      case "متأخر":
        return "text-destructive bg-destructive/10";
      default:
        return "text-muted-foreground bg-muted/50";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* الترحيب */}
      <div className="bg-gradient-to-r from-primary to-accent rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">مرحباً بك في لوحة الإدارة</h1>
        <p className="text-white/90">
          إدارة شاملة لجميع أعمال وكالة الدعاية والإعلان
        </p>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  إجمالي العملاء
                </p>
                {customersStats ? (
                  <>
                    <p className="text-2xl font-bold">{customersStats.totalCustomers}</p>
                    <p className="text-sm text-success mt-1">
                      +{customersStats.newThisMonth} هذا الشهر
                    </p>
                  </>
                ) : (
                  <Skeleton className="h-8 w-16 mb-2" />
                )}
              </div>
              <div className="bg-primary/10 p-3 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  الطلبات النشطة
                </p>
                {ordersStats ? (
                  <>
                    <p className="text-2xl font-bold">{ordersStats.activeOrders}</p>
                    <p className="text-sm text-success mt-1">
                      من إجمالي {ordersStats.totalOrders}
                    </p>
                  </>
                ) : (
                  <Skeleton className="h-8 w-16 mb-2" />
                )}
              </div>
              <div className="bg-success/10 p-3 rounded-lg">
                <ClipboardList className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  الإيرادات الشهرية
                </p>
                {ordersStats ? (
                  <>
                    <p className="text-2xl font-bold">{formatCurrency(ordersStats.monthlyRevenue)}</p>
                    <p className="text-sm text-success mt-1">
                      هذا الشهر
                    </p>
                  </>
                ) : (
                  <Skeleton className="h-8 w-24 mb-2" />
                )}
              </div>
              <div className="bg-accent/10 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  إجمالي قيمة العملاء
                </p>
                {customersStats ? (
                  <>
                    <p className="text-2xl font-bold">{formatCurrency(customersStats.totalSpent)}</p>
                    <p className="text-sm text-success mt-1">
                      المجموع التراكمي
                    </p>
                  </>
                ) : (
                  <Skeleton className="h-8 w-24 mb-2" />
                )}
              </div>
              <div className="bg-warning/10 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* الطلبات الأخيرة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              الطلبات الأخيرة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders ? (
                recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer"
                      onClick={() => navigate('/admin/orders')}
                    >
                      <div>
                        <p className="font-medium">
                          {order.customers?.name || 'عميل غير محدد'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.service_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('ar-SA')}
                        </p>
                        <p className="text-xs font-medium text-accent">
                          {formatCurrency(order.amount)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          className={getStatusColor(order.status)}
                        >
                          {order.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {order.order_number}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    لا توجد طلبات حالياً
                  </p>
                )
              ) : (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              )}
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => navigate('/admin/orders')}
            >
              عرض جميع الطلبات
            </Button>
          </CardContent>
        </Card>

        {/* الفواتير الأخيرة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              الفواتير الأخيرة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentInvoices ? (
                recentInvoices.length > 0 ? (
                  recentInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer"
                      onClick={() => navigate('/admin/invoices')}
                    >
                      <div>
                        <p className="font-medium">
                          {invoice.customers?.name || 'عميل غير محدد'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.invoice_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(invoice.created_at).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <p className="font-medium text-accent">
                          {formatCurrency(invoice.total_amount)}
                        </p>
                        <Badge
                          className={getStatusColor(invoice.status)}
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    لا توجد فواتير حالياً
                  </p>
                )
              ) : (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              )}
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => navigate('/admin/invoices')}
            >
              عرض جميع الفواتير
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* التنبيهات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            التنبيهات والمهام
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-warning/10 rounded-lg">
              <Clock className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm font-medium">
                  {ordersStats?.activeOrders || 0} طلبات نشطة
                </p>
                <p className="text-xs text-muted-foreground">تحتاج متابعة</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
              <CheckCircle className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium">
                  {recentInvoices?.length || 0} فواتير جديدة
                </p>
                <p className="text-xs text-muted-foreground">هذا الأسبوع</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg">
              <MessageSquare className="h-5 w-5 text-accent" />
              <div>
                <p className="text-sm font-medium">
                  {pendingMessages || 0} رسائل معلقة
                </p>
                <p className="text-xs text-muted-foreground">في انتظار الإرسال</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* الأعمال السريعة */}
      <Card>
        <CardHeader>
          <CardTitle>الأعمال السريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/admin/customers')}
            >
              <Users className="h-6 w-6" />
              إضافة عميل جديد
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/admin/orders')}
            >
              <ClipboardList className="h-6 w-6" />
              إنشاء طلب جديد
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/admin/invoices')}
            >
              <DollarSign className="h-6 w-6" />
              إنشاء فاتورة
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/admin/whatsapp')}
            >
              <MessageSquare className="h-6 w-6" />
              إرسال رسالة WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;