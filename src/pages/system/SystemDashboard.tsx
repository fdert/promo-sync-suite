import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, CreditCard, Settings, BarChart3, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface SystemStats {
  totalAgencies: number;
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  trialUsers: number;
}

const SystemDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<SystemStats>({
    totalAgencies: 0,
    totalUsers: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    trialUsers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    try {
      // جلب إحصائيات الوكالات
      const { data: agencies } = await supabase
        .from('agencies')
        .select('id')
        .eq('is_active', true);

      // جلب إحصائيات المستخدمين
      const { data: users } = await supabase
        .from('user_roles')
        .select('user_id')
        .neq('role', 'super_admin');

      // جلب إحصائيات الاشتراكات النشطة
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('id, payment_transactions(amount)')
        .eq('status', 'active');

      // حساب إجمالي الإيرادات
      const totalRevenue = subscriptions?.reduce((sum, sub) => {
        const subTotal = sub.payment_transactions?.reduce((subSum: number, payment: any) => 
          subSum + (payment.amount || 0), 0) || 0;
        return sum + subTotal;
      }, 0) || 0;

      setStats({
        totalAgencies: agencies?.length || 0,
        totalUsers: new Set(users?.map(u => u.user_id)).size || 0,
        activeSubscriptions: subscriptions?.length || 0,
        totalRevenue,
        trialUsers: 0 // يمكن إضافة حساب المستخدمين التجريبيين لاحقاً
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
      toast.error('حدث خطأ في جلب الإحصائيات');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "إجمالي الوكالات",
      value: stats.totalAgencies,
      description: "الوكالات المسجلة في النظام",
      icon: Building2,
      color: "text-blue-600"
    },
    {
      title: "إجمالي المستخدمين",
      value: stats.totalUsers,
      description: "المستخدمين النشطين",
      icon: Users,
      color: "text-green-600"
    },
    {
      title: "الاشتراكات النشطة",
      value: stats.activeSubscriptions,
      description: "الاشتراكات المدفوعة",
      icon: CreditCard,
      color: "text-purple-600"
    },
    {
      title: "إجمالي الإيرادات",
      value: `${stats.totalRevenue.toLocaleString()} ر.س`,
      description: "الإيرادات الإجمالية",
      icon: BarChart3,
      color: "text-orange-600"
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">لوحة تحكم إدارة النظام</h1>
          <p className="text-muted-foreground">مرحباً بك في لوحة تحكم إدارة النظام العامة</p>
        </div>
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <AlertTriangle className="h-4 w-4 mr-1" />
          مدير النظام
        </Badge>
      </div>

      {/* إحصائيات عامة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* قائمة الوصول السريع */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/system/agencies')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              إدارة الوكالات
            </CardTitle>
            <CardDescription>
              عرض وإدارة جميع الوكالات المسجلة في النظام
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/system/users')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              إدارة المستخدمين
            </CardTitle>
            <CardDescription>
              إدارة المستخدمين وصلاحياتهم في النظام
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/system/subscription-plans')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              إدارة الاشتراكات
            </CardTitle>
            <CardDescription>
              إدارة خطط الاشتراك والمدفوعات
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow opacity-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-orange-600" />
              التقارير والإحصائيات
            </CardTitle>
            <CardDescription>
              تقارير مفصلة عن أداء النظام والإيرادات (قريباً)
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/system/settings')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-600" />
              إعدادات النظام
            </CardTitle>
            <CardDescription>
              إدارة الإعدادات العامة للنظام والمنصة
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};

export default SystemDashboard;