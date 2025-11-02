// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users,
  ClipboardList,
  FileText,
  MessageSquare,
  Star,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface DashboardStats {
  totalCustomers: number;
  totalOrders: number;
  totalOrdersValue: number;
  totalEvaluations: number;
  pendingOrders: number;
  completedOrders: number;
  dueTodayOrders: number;
  incompleteTasks: number;
}

interface Order {
  id: string;
  order_number: string;
  delivery_date: string;
  status: string;
  customer_id: string;
  customers?: {
    name: string;
  };
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  icon: string;
}

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalOrders: 0,
    totalOrdersValue: 0,
    totalEvaluations: 0,
    pendingOrders: 0,
    completedOrders: 0,
    dueTodayOrders: 0,
    incompleteTasks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [dueTodayOrders, setDueTodayOrders] = useState<Order[]>([]);
  const [incompleteOrders, setIncompleteOrders] = useState<Order[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;
      
      try {
        const today = new Date().toISOString().split('T')[0];

        // جلب إحصائيات العملاء الذين أدخلهم الموظف
        const { count: customersCount } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', user.id);

        // جلب إحصائيات الطلبات المدخلة من الموظف
        const { count: ordersCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', user.id);

        // جلب إجمالي قيمة الطلبات المدخلة من الموظف
        const { data: ordersValue } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('created_by', user.id);
        
        const totalOrdersValue = ordersValue?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

        // جلب إحصائيات التقييمات
        const { count: evaluationsCount } = await supabase
          .from('evaluations')
          .select('*', { count: 'exact', head: true })
          .not('rating', 'is', null);

        // جلب الطلبات قيد الانتظار للموظف
        const { count: pendingOrdersCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', user.id)
          .in('status', ['جديد', 'قيد التنفيذ']);

        // جلب الطلبات المكتملة للموظف
        const { count: completedOrdersCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', user.id)
          .eq('status', 'مكتمل');

        // جلب الطلبات المستحقة اليوم
        const { data: dueTodayData, count: dueTodayCount } = await supabase
          .from('orders')
          .select('*, customers(name)', { count: 'exact' })
          .eq('created_by', user.id)
          .eq('delivery_date', today)
          .neq('status', 'مكتمل')
          .order('created_at', { ascending: false });

        // جلب جميع الطلبات غير المكتملة
        const { data: incompleteData, count: incompleteCount } = await supabase
          .from('orders')
          .select('*, customers(name)', { count: 'exact' })
          .eq('created_by', user.id)
          .in('status', ['جديد', 'قيد التنفيذ'])
          .order('delivery_date', { ascending: true });

        setDueTodayOrders(dueTodayData || []);
        setIncompleteOrders(incompleteData || []);

        // جلب النشاطات الحديثة
        const activities: RecentActivity[] = [];

        // جلب آخر 3 طلبات
        const { data: recentOrders } = await supabase
          .from('orders')
          .select('id, order_number, created_at, status, customers(name)')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })
          .limit(3);

        recentOrders?.forEach((order) => {
          activities.push({
            id: order.id,
            type: 'order',
            description: `تم إضافة طلب ${order.order_number} للعميل ${order.customers?.name}`,
            timestamp: order.created_at,
            icon: 'order'
          });
        });

        // جلب آخر 3 مدفوعات
        const { data: recentPayments } = await supabase
          .from('payments')
          .select('id, amount, created_at, orders(order_number, customers(name))')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })
          .limit(3);

        recentPayments?.forEach((payment: any) => {
          activities.push({
            id: payment.id,
            type: 'payment',
            description: `تم تسجيل دفعة ${payment.amount} ر.س للطلب ${payment.orders?.order_number}`,
            timestamp: payment.created_at,
            icon: 'payment'
          });
        });

        // جلب آخر 3 عملاء
        const { data: recentCustomers } = await supabase
          .from('customers')
          .select('id, name, created_at')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })
          .limit(3);

        recentCustomers?.forEach((customer) => {
          activities.push({
            id: customer.id,
            type: 'customer',
            description: `تم إضافة عميل جديد: ${customer.name}`,
            timestamp: customer.created_at,
            icon: 'customer'
          });
        });

        // ترتيب النشاطات حسب التاريخ
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setRecentActivities(activities.slice(0, 5));

        setStats({
          totalCustomers: customersCount || 0,
          totalOrders: ordersCount || 0,
          totalOrdersValue: totalOrdersValue,
          totalEvaluations: evaluationsCount || 0,
          pendingOrders: pendingOrdersCount || 0,
          completedOrders: completedOrdersCount || 0,
          dueTodayOrders: dueTodayCount || 0,
          incompleteTasks: incompleteCount || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'الموظف';

  return (
    <>
      {/* نافذة ترحيبية */}
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <span className="text-3xl">👋</span>
              مرحباً {userName}!
            </DialogTitle>
            <DialogDescription className="text-base space-y-4 pt-4">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-lg border border-primary/20">
                <p className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  إحصائياتك اليوم
                </p>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="bg-background/50 p-3 rounded">
                    <p className="text-sm text-muted-foreground">طلباتك الكلية</p>
                    <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
                  </div>
                  <div className="bg-background/50 p-3 rounded">
                    <p className="text-sm text-muted-foreground">طلبات مكتملة</p>
                    <p className="text-2xl font-bold text-green-600">{stats.completedOrders}</p>
                  </div>
                </div>
              </div>

              {stats.dueTodayOrders > 0 && (
                <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                  <p className="font-semibold text-orange-800 dark:text-orange-200 flex items-center gap-2 mb-3">
                    <AlertCircle className="h-5 w-5" />
                    طلبات مستحقة اليوم ({stats.dueTodayOrders})
                  </p>
                  <div className="space-y-2">
                    {dueTodayOrders.slice(0, 3).map((order) => (
                      <div key={order.id} className="bg-background/70 p-2 rounded text-sm">
                        <p className="font-medium text-foreground">
                          {order.order_number} - {order.customers?.name}
                        </p>
                        <Badge variant="outline" className="mt-1">{order.status}</Badge>
                      </div>
                    ))}
                    {dueTodayOrders.length > 3 && (
                      <p className="text-xs text-muted-foreground">+{dueTodayOrders.length - 3} طلبات أخرى</p>
                    )}
                  </div>
                </div>
              )}

              {stats.incompleteTasks > 0 && (
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2 mb-3">
                    <ClipboardList className="h-5 w-5" />
                    مهام قيد التنفيذ ({stats.incompleteTasks})
                  </p>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {incompleteOrders.map((order) => (
                      <div key={order.id} className="bg-background/70 p-2 rounded text-sm">
                        <p className="font-medium text-foreground">
                          {order.order_number} - {order.customers?.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{order.status}</Badge>
                          {order.delivery_date && (
                            <span className="text-xs text-muted-foreground">
                              التسليم: {new Date(order.delivery_date).toLocaleDateString('ar-SA')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {stats.dueTodayOrders === 0 && stats.incompleteTasks === 0 && (
                <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <p className="font-semibold text-green-800 dark:text-green-200">
                    رائع! لا توجد مهام عاجلة اليوم
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    استمر في الأداء الممتاز 🌟
                  </p>
                </div>
              )}

              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 text-center">
                <p className="text-foreground font-medium">💪 أنت تقوم بعمل رائع!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  استمر في التميز وتحقيق الأهداف
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowWelcome(false)} size="lg">
              ابدأ العمل
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">لوحة الموظف</h1>
          <p className="text-muted-foreground">مرحباً {userName} - إحصائياتك الشخصية</p>
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العملاء</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">إجمالي العملاء</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الطلبات</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">إجمالي الطلبات</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيمة الطلبات</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrdersValue.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">إجمالي قيمة الطلبات</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">التقييمات</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvaluations}</div>
            <p className="text-xs text-muted-foreground">التقييمات المكتملة</p>
          </CardContent>
        </Card>
        </div>

        {/* إحصائيات متقدمة */}
        <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              حالة الطلبات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">قيد التنفيذ</span>
              <Badge variant="outline">{stats.pendingOrders}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">مكتملة</span>
              <Badge variant="default">{stats.completedOrders}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              نشاط حديث
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                    <div className="flex-shrink-0 mt-1">
                      {activity.icon === 'order' && (
                        <ClipboardList className="h-4 w-4 text-blue-600" />
                      )}
                      {activity.icon === 'payment' && (
                        <FileText className="h-4 w-4 text-green-600" />
                      )}
                      {activity.icon === 'customer' && (
                        <Users className="h-4 w-4 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.timestamp).toLocaleString('ar-SA', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">لا توجد أنشطة حديثة</p>
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        {/* معلومات المستخدم */}
        <Card>
        <CardHeader>
          <CardTitle>معلومات المستخدم</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">البريد الإلكتروني</label>
              <p className="text-sm">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">آخر تسجيل دخول</label>
              <p className="text-sm">
                {user?.last_sign_in_at 
                  ? new Date(user.last_sign_in_at).toLocaleString('ar-SA')
                  : 'غير متوفر'
                }
              </p>
            </div>
          </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default EmployeeDashboard;