import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Settings, Users, TrendingUp, Award } from "lucide-react";

interface LoyaltySettings {
  id: string;
  points_per_currency: number;
  currency_per_point: number;
  min_points_to_redeem: number;
  points_expiry_days: number | null;
  is_active: boolean;
  welcome_points: number;
}

interface CustomerWithPoints {
  id: string;
  name: string;
  whatsapp: string;
  total_points: number;
  lifetime_points: number;
  redeemed_points: number;
}

const LoyaltySettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerWithPoints[]>([]);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalPointsIssued: 0,
    totalPointsRedeemed: 0,
    activeCustomers: 0
  });

  useEffect(() => {
    fetchSettings();
    fetchCustomersWithPoints();
    fetchStats();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("loyalty_settings")
        .select("*")
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "خطأ",
        description: "فشل في جلب إعدادات نظام الولاء",
        variant: "destructive",
      });
    }
  };

  const fetchCustomersWithPoints = async () => {
    try {
      const { data, error } = await supabase
        .from("customer_loyalty_points")
        .select(`
          total_points,
          lifetime_points,
          redeemed_points,
          customers (id, name, whatsapp)
        `)
        .order("total_points", { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedData = data.map((item: any) => ({
        id: item.customers.id,
        name: item.customers.name,
        whatsapp: item.customers.whatsapp,
        total_points: item.total_points,
        lifetime_points: item.lifetime_points,
        redeemed_points: item.redeemed_points
      }));

      setCustomers(formattedData);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: pointsData, error: pointsError } = await supabase
        .from("customer_loyalty_points")
        .select("total_points, lifetime_points, redeemed_points");

      if (pointsError) throw pointsError;

      const totalPointsIssued = pointsData.reduce((sum, item) => sum + item.lifetime_points, 0);
      const totalPointsRedeemed = pointsData.reduce((sum, item) => sum + item.redeemed_points, 0);
      const activeCustomers = pointsData.filter(item => item.total_points > 0).length;

      setStats({
        totalCustomers: pointsData.length,
        totalPointsIssued,
        totalPointsRedeemed,
        activeCustomers
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("loyalty_settings")
        .update({
          points_per_currency: settings.points_per_currency,
          currency_per_point: settings.currency_per_point,
          min_points_to_redeem: settings.min_points_to_redeem,
          points_expiry_days: settings.points_expiry_days,
          is_active: settings.is_active,
          welcome_points: settings.welcome_points,
          updated_at: new Date().toISOString()
        })
        .eq("id", settings.id);

      if (error) throw error;

      toast({
        title: "نجح",
        description: "تم حفظ الإعدادات بنجاح",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ الإعدادات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: "إجمالي العملاء المشتركين",
      value: stats.totalCustomers,
      icon: Users,
      color: "text-blue-500"
    },
    {
      title: "إجمالي النقاط الممنوحة",
      value: stats.totalPointsIssued.toLocaleString(),
      icon: TrendingUp,
      color: "text-green-500"
    },
    {
      title: "النقاط المستبدلة",
      value: stats.totalPointsRedeemed.toLocaleString(),
      icon: Award,
      color: "text-purple-500"
    },
    {
      title: "العملاء النشطون",
      value: stats.activeCustomers,
      icon: Users,
      color: "text-orange-500"
    }
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">إعدادات نظام الولاء</h1>
        <p className="text-muted-foreground">إدارة إعدادات وإحصائيات نظام الولاء</p>
      </div>

      {/* إحصائيات */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
          <TabsTrigger value="customers">العملاء والنقاط</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                إعدادات نظام الولاء
              </CardTitle>
              <CardDescription>
                قم بتخصيص قواعد نظام الولاء حسب احتياجاتك
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settings && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="active">تفعيل نظام الولاء</Label>
                      <p className="text-sm text-muted-foreground">
                        تفعيل أو إيقاف نظام الولاء بالكامل
                      </p>
                    </div>
                    <Switch
                      id="active"
                      checked={settings.is_active}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, is_active: checked })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="points_per_currency">نقاط لكل ريال</Label>
                      <Input
                        id="points_per_currency"
                        type="number"
                        step="0.1"
                        value={settings.points_per_currency}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            points_per_currency: parseFloat(e.target.value),
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        كم نقطة يحصل عليها العميل لكل ريال ينفقه
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="currency_per_point">قيمة النقطة بالريال</Label>
                      <Input
                        id="currency_per_point"
                        type="number"
                        step="0.01"
                        value={settings.currency_per_point}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            currency_per_point: parseFloat(e.target.value),
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        قيمة كل نقطة عند الاستبدال
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min_points">الحد الأدنى للاستبدال</Label>
                      <Input
                        id="min_points"
                        type="number"
                        value={settings.min_points_to_redeem}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            min_points_to_redeem: parseInt(e.target.value),
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        الحد الأدنى من النقاط المطلوب للاستبدال
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="welcome_points">نقاط الترحيب</Label>
                      <Input
                        id="welcome_points"
                        type="number"
                        value={settings.welcome_points}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            welcome_points: parseInt(e.target.value),
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        نقاط مكافأة للعملاء الجدد
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiry">مدة انتهاء النقاط (بالأيام)</Label>
                    <Input
                      id="expiry"
                      type="number"
                      value={settings.points_expiry_days || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          points_expiry_days: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      placeholder="اتركه فارغاً لعدم انتهاء النقاط"
                    />
                    <p className="text-xs text-muted-foreground">
                      عدد الأيام حتى انتهاء صلاحية النقاط (اختياري)
                    </p>
                  </div>

                  <Button onClick={handleSaveSettings} disabled={loading} className="w-full">
                    {loading ? "جاري الحفظ..." : "حفظ الإعدادات"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>العملاء ورصيد النقاط</CardTitle>
              <CardDescription>قائمة بجميع العملاء ونقاط الولاء الخاصة بهم</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم العميل</TableHead>
                    <TableHead>رقم الواتساب</TableHead>
                    <TableHead>الرصيد الحالي</TableHead>
                    <TableHead>إجمالي النقاط</TableHead>
                    <TableHead>النقاط المستبدلة</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        لا يوجد عملاء مسجلين في نظام الولاء
                      </TableCell>
                    </TableRow>
                  ) : (
                    customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.whatsapp || "-"}</TableCell>
                        <TableCell>
                          <span className="font-bold text-primary">{customer.total_points}</span>
                        </TableCell>
                        <TableCell>{customer.lifetime_points}</TableCell>
                        <TableCell>{customer.redeemed_points}</TableCell>
                        <TableCell>
                          <Badge variant={customer.total_points > 0 ? "default" : "secondary"}>
                            {customer.total_points > 0 ? "نشط" : "غير نشط"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LoyaltySettings;
