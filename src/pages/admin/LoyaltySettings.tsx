import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Settings, Users, TrendingUp, Award, Plus, Minus, Gift } from "lucide-react";

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

interface Customer {
  id: string;
  name: string;
  whatsapp: string;
}

interface LoyaltyPoints {
  id: string;
  customer_id: string;
  total_points: number;
  lifetime_points: number;
  redeemed_points: number;
}

interface LoyaltyTransaction {
  id: string;
  customer_id: string;
  transaction_type: string;
  points: number;
  balance_after: number;
  description: string;
  created_at: string;
  customers: Customer;
}

const LoyaltySettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerWithPoints[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerPoints, setCustomerPoints] = useState<LoyaltyPoints | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [transactionForm, setTransactionForm] = useState({
    type: "earn",
    points: "",
    description: ""
  });
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalPointsIssued: 0,
    totalPointsRedeemed: 0,
    activeCustomers: 0
  });

  useEffect(() => {
    fetchSettings();
    fetchCustomersWithPoints();
    fetchAllCustomers();
    fetchStats();
    fetchRecentTransactions();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerPoints(selectedCustomerId);
    }
  }, [selectedCustomerId]);

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

  const fetchAllCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, whatsapp")
        .order("name");

      if (error) throw error;
      setAllCustomers(data || []);
    } catch (error) {
      console.error("Error fetching all customers:", error);
    }
  };

  const fetchCustomerPoints = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from("customer_loyalty_points")
        .select("*")
        .eq("customer_id", customerId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        const { data: newPoints, error: insertError } = await supabase
          .from("customer_loyalty_points")
          .insert({ customer_id: customerId, total_points: 0 })
          .select()
          .single();

        if (insertError) throw insertError;
        setCustomerPoints(newPoints);
      } else {
        setCustomerPoints(data);
      }
    } catch (error) {
      console.error("Error fetching customer points:", error);
    }
  };

  const fetchRecentTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("loyalty_transactions")
        .select(`
          *,
          customers (id, name, whatsapp)
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
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

  const handleTransaction = async () => {
    if (!selectedCustomerId || !transactionForm.points) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار عميل وإدخال عدد النقاط",
        variant: "destructive",
      });
      return;
    }

    if (!settings?.is_active) {
      toast({
        title: "تنبيه",
        description: "نظام الولاء غير مفعل حالياً",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const points = parseInt(transactionForm.points);
      const isRedeem = transactionForm.type === "redeem";

      if (isRedeem && customerPoints && points > customerPoints.total_points) {
        throw new Error("عدد النقاط المطلوب استبداله أكبر من رصيد العميل");
      }

      if (isRedeem && settings && points < settings.min_points_to_redeem) {
        throw new Error(`الحد الأدنى للاستبدال هو ${settings.min_points_to_redeem} نقطة`);
      }

      const pointsChange = isRedeem ? -points : points;
      const newBalance = (customerPoints?.total_points || 0) + pointsChange;

      const { error: updateError } = await supabase
        .from("customer_loyalty_points")
        .update({
          total_points: newBalance,
          lifetime_points: isRedeem ? customerPoints?.lifetime_points : (customerPoints?.lifetime_points || 0) + points,
          redeemed_points: isRedeem ? (customerPoints?.redeemed_points || 0) + points : customerPoints?.redeemed_points
        })
        .eq("customer_id", selectedCustomerId);

      if (updateError) throw updateError;

      const { error: transactionError } = await supabase
        .from("loyalty_transactions")
        .insert([{
          customer_id: selectedCustomerId,
          transaction_type: transactionForm.type as any,
          points: points,
          balance_after: newBalance,
          description: transactionForm.description,
          created_by: user?.id
        }]);

      if (transactionError) throw transactionError;

      const customer = allCustomers.find(c => c.id === selectedCustomerId);
      if (customer?.whatsapp) {
        await sendWhatsAppNotification(customer, newBalance, pointsChange, isRedeem);
      }

      toast({
        title: "نجح",
        description: `تم ${isRedeem ? 'خصم' : 'إضافة'} ${points} نقطة بنجاح`,
      });

      setTransactionForm({ type: "earn", points: "", description: "" });
      fetchCustomerPoints(selectedCustomerId);
      fetchRecentTransactions();
      fetchCustomersWithPoints();
      fetchStats();
    } catch (error: any) {
      console.error("Error processing transaction:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في معالجة العملية",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppNotification = async (
    customer: Customer,
    balance: number,
    pointsChange: number,
    isRedeem: boolean
  ) => {
    try {
      const message = `مرحباً ${customer.name}،\n\n${
        isRedeem 
          ? `تم خصم ${Math.abs(pointsChange)} نقطة من رصيدك` 
          : `تم إضافة ${pointsChange} نقطة إلى رصيدك`
      }.\n\nرصيدك الحالي: ${balance} نقطة\n\nشكراً لولائكم! 🎁`;

      await supabase.functions.invoke("send-direct-whatsapp", {
        body: {
          phone: customer.whatsapp,
          message: message
        }
      });
    } catch (error) {
      console.error("Error sending WhatsApp notification:", error);
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

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "earn": return <Plus className="h-4 w-4 text-green-500" />;
      case "redeem": return <Minus className="h-4 w-4 text-red-500" />;
      case "welcome_bonus": return <Gift className="h-4 w-4 text-blue-500" />;
      default: return <Award className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTransactionBadge = (type: string) => {
    const variants: Record<string, any> = {
      earn: "default",
      redeem: "destructive",
      welcome_bonus: "secondary",
      adjustment: "outline"
    };
    return variants[type] || "outline";
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
          <TabsTrigger value="manage">إدارة النقاط</TabsTrigger>
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

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>إدارة نقاط العملاء</CardTitle>
              <CardDescription>
                إضافة أو خصم أو تعديل نقاط الولاء للعملاء
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer">العميل</Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العميل" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCustomers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {customerPoints && (
                <Card className="bg-muted">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">الرصيد الحالي</p>
                        <p className="text-2xl font-bold text-primary">{customerPoints.total_points}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">إجمالي النقاط المكتسبة</p>
                        <p className="text-2xl font-bold">{customerPoints.lifetime_points}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">النقاط المستبدلة</p>
                        <p className="text-2xl font-bold">{customerPoints.redeemed_points}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">نوع العملية</Label>
                  <Select value={transactionForm.type} onValueChange={(value) => setTransactionForm({ ...transactionForm, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="earn">إضافة نقاط</SelectItem>
                      <SelectItem value="redeem">خصم نقاط (استبدال)</SelectItem>
                      <SelectItem value="adjustment">تعديل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="points">عدد النقاط</Label>
                  <Input
                    id="points"
                    type="number"
                    value={transactionForm.points}
                    onChange={(e) => setTransactionForm({ ...transactionForm, points: e.target.value })}
                    placeholder="أدخل عدد النقاط"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">الوصف (اختياري)</Label>
                <Textarea
                  id="description"
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                  placeholder="وصف العملية"
                  rows={3}
                />
              </div>

              {settings && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• كل {settings.points_per_currency} ريال = نقطة واحدة</p>
                  <p>• كل نقطة = {settings.currency_per_point} ريال</p>
                  <p>• الحد الأدنى للاستبدال: {settings.min_points_to_redeem} نقطة</p>
                </div>
              )}

              <Button
                onClick={handleTransaction}
                disabled={loading || !selectedCustomerId || !transactionForm.points}
                className="w-full"
              >
                {loading ? "جاري المعالجة..." : "تنفيذ العملية"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>سجل معاملات الولاء</CardTitle>
              <CardDescription>آخر 20 معاملة</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>النقاط</TableHead>
                    <TableHead>الرصيد بعد</TableHead>
                    <TableHead>الوصف</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        لا توجد معاملات
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {new Date(transaction.created_at).toLocaleDateString('ar-SA')}
                        </TableCell>
                        <TableCell>{transaction.customers?.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(transaction.transaction_type)}
                            <Badge variant={getTransactionBadge(transaction.transaction_type)}>
                              {transaction.transaction_type === 'earn' ? 'إضافة' :
                               transaction.transaction_type === 'redeem' ? 'خصم' :
                               transaction.transaction_type === 'welcome_bonus' ? 'مكافأة' : 'تعديل'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className={transaction.transaction_type === 'redeem' ? 'text-red-500' : 'text-green-500'}>
                          {transaction.transaction_type === 'redeem' ? '-' : '+'}{transaction.points}
                        </TableCell>
                        <TableCell>{transaction.balance_after}</TableCell>
                        <TableCell className="max-w-xs truncate">{transaction.description || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
