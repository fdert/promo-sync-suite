import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Minus, Gift, TrendingUp, Users, Award } from "lucide-react";

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

interface LoyaltySettings {
  points_per_currency: number;
  currency_per_point: number;
  min_points_to_redeem: number;
  is_active: boolean;
}

const LoyaltyManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerPoints, setCustomerPoints] = useState<LoyaltyPoints | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchSettings();
    fetchRecentTransactions();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerPoints(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, whatsapp")
        .order("name");

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast({
        title: "خطأ",
        description: "فشل في جلب بيانات العملاء",
        variant: "destructive",
      });
    }
  };

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
        // إنشاء سجل نقاط جديد للعميل
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
      title: "إجمالي العملاء",
      value: customers.length,
      icon: Users,
      color: "text-blue-500"
    },
    {
      title: "إجمالي المعاملات اليوم",
      value: transactions.filter(t => {
        const today = new Date().toDateString();
        return new Date(t.created_at).toDateString() === today;
      }).length,
      icon: TrendingUp,
      color: "text-green-500"
    }
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">نظام الولاء</h1>
        <p className="text-muted-foreground">عرض نقاط الولاء للعملاء</p>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
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

      <Card>
        <CardHeader>
          <CardTitle>عرض نقاط العملاء</CardTitle>
          <CardDescription>
            يمكنك الاطلاع على نقاط الولاء للعملاء فقط. لإدارة النقاط، يرجى الرجوع إلى لوحة الإدارة.
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
                {customers.map((customer) => (
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

          {settings && (
            <div className="text-sm text-muted-foreground space-y-1 p-4 bg-muted rounded-lg">
              <p className="font-semibold mb-2">إعدادات نظام الولاء:</p>
              <p>• كل {settings.points_per_currency} ريال = نقطة واحدة</p>
              <p>• كل نقطة = {settings.currency_per_point} ريال</p>
              <p>• الحد الأدنى للاستبدال: {settings.min_points_to_redeem} نقطة</p>
            </div>
          )}
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
                    <TableCell className="max-w-xs truncate">
                      {transaction.description || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoyaltyManagement;
