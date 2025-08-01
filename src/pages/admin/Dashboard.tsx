import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  ClipboardList,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
} from "lucide-react";

const Dashboard = () => {
  const stats = [
    {
      title: "إجمالي العملاء",
      value: "248",
      change: "+12%",
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "الطلبات النشطة",
      value: "23",
      change: "+8%",
      icon: ClipboardList,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "الإيرادات الشهرية",
      value: "45,230 ر.س",
      change: "+15%",
      icon: DollarSign,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "معدل النمو",
      value: "18.5%",
      change: "+3%",
      icon: TrendingUp,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  const recentOrders = [
    {
      id: "ORD-001",
      customer: "أحمد محمد",
      service: "تصميم شعار",
      status: "قيد التنفيذ",
      date: "2024-01-15",
    },
    {
      id: "ORD-002",
      customer: "مؤسسة الأمل",
      service: "حملة إعلانية",
      status: "مكتمل",
      date: "2024-01-14",
    },
    {
      id: "ORD-003",
      customer: "شركة النجاح",
      service: "موقع إلكتروني",
      status: "قيد المراجعة",
      date: "2024-01-13",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "مكتمل":
        return "text-success bg-success/10";
      case "قيد التنفيذ":
        return "text-primary bg-primary/10";
      case "قيد المراجعة":
        return "text-warning bg-warning/10";
      default:
        return "text-muted-foreground bg-muted/50";
    }
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
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-success mt-1">{stat.change}</p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{order.customer}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.service}
                    </p>
                    <p className="text-xs text-muted-foreground">{order.date}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              عرض جميع الطلبات
            </Button>
          </CardContent>
        </Card>

        {/* التنبيهات */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              التنبيهات والمهام
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-warning/10 rounded-lg">
                <Clock className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm font-medium">3 طلبات تحتاج مراجعة</p>
                  <p className="text-xs text-muted-foreground">منذ ساعتين</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm font-medium">تم إرسال 15 فاتورة</p>
                  <p className="text-xs text-muted-foreground">اليوم</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg">
                <MessageSquare className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-sm font-medium">رسائل WhatsApp جديدة</p>
                  <p className="text-xs text-muted-foreground">منذ 30 دقيقة</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الأعمال السريعة */}
      <Card>
        <CardHeader>
          <CardTitle>الأعمال السريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="hero" className="h-20 flex-col gap-2">
              <Users className="h-6 w-6" />
              إضافة عميل جديد
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <ClipboardList className="h-6 w-6" />
              إنشاء طلب جديد
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <DollarSign className="h-6 w-6" />
              إنشاء فاتورة
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
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