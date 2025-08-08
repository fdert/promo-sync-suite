import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users,
  ClipboardList,
  FileText,
  MessageSquare,
  Star,
  TrendingUp,
} from "lucide-react";

interface DashboardStats {
  totalCustomers: number;
  totalOrders: number;
  totalOrdersValue: number;
  totalEvaluations: number;
  pendingOrders: number;
  completedOrders: number;
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
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // جلب إحصائيات العملاء
        const { count: customersCount } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true });

        // جلب إحصائيات الطلبات
        const { count: ordersCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true });

        // جلب إجمالي قيمة الطلبات
        const { data: ordersValue } = await supabase
          .from('orders')
          .select('amount');
        
        const totalOrdersValue = ordersValue?.reduce((sum, order) => sum + (order.amount || 0), 0) || 0;

        // جلب إحصائيات التقييمات
        const { count: evaluationsCount } = await supabase
          .from('evaluations')
          .select('*', { count: 'exact', head: true })
          .not('submitted_at', 'is', null);

        // جلب الطلبات قيد الانتظار
        const { count: pendingOrdersCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .in('status', ['جديد', 'قيد التنفيذ']);

        // جلب الطلبات المكتملة
        const { count: completedOrdersCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'مكتمل');

        setStats({
          totalCustomers: customersCount || 0,
          totalOrders: ordersCount || 0,
          totalOrdersValue: totalOrdersValue,
          totalEvaluations: evaluationsCount || 0,
          pendingOrders: pendingOrdersCount || 0,
          completedOrders: completedOrdersCount || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">لوحة الموظف</h1>
        <p className="text-muted-foreground">مرحباً بك في نظام إدارة الوكالة</p>
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
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                أحدث الأنشطة ستظهر هنا...
              </p>
            </div>
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
  );
};

export default EmployeeDashboard;