import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, DollarSign, CreditCard } from "lucide-react";

const Accounts = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("month");

  // Mock data - في التطبيق الحقيقي سيأتي من قاعدة البيانات
  const accounts = [
    {
      id: 1,
      name: "الحساب الجاري الرئيسي",
      type: "checking",
      balance: 45000,
      currency: "SAR",
      status: "active"
    },
    {
      id: 2,
      name: "حساب التوفير",
      type: "savings", 
      balance: 120000,
      currency: "SAR",
      status: "active"
    },
    {
      id: 3,
      name: "حساب العمليات",
      type: "business",
      balance: 28500,
      currency: "SAR", 
      status: "active"
    }
  ];

  const transactions = [
    {
      id: 1,
      description: "دفعة من عميل - مشروع تطوير موقع",
      amount: 5000,
      type: "income",
      date: "2024-01-20",
      account: "الحساب الجاري الرئيسي"
    },
    {
      id: 2,
      description: "شراء معدات مكتبية",
      amount: -800,
      type: "expense",
      date: "2024-01-19",
      account: "حساب العمليات"
    },
    {
      id: 3,
      description: "رسوم اشتراك برامج",
      amount: -450,
      type: "expense",
      date: "2024-01-18",
      account: "الحساب الجاري الرئيسي"
    },
    {
      id: 4,
      description: "دفعة من عميل - استشارة تقنية",
      amount: 2500,
      type: "income",
      date: "2024-01-17",
      account: "الحساب الجاري الرئيسي"
    }
  ];

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case "checking":
        return "حساب جاري";
      case "savings":
        return "حساب توفير";
      case "business":
        return "حساب تجاري";
      default:
        return type;
    }
  };

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const monthlyIncome = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpenses = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة الحسابات</h1>
          <p className="text-muted-foreground">متابعة الحسابات المالية والمعاملات</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة حساب جديد
        </Button>
      </div>

      {/* Financial Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الرصيد</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBalance.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">جميع الحسابات</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الإيرادات الشهرية</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{monthlyIncome.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">+12% من الشهر الماضي</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المصروفات الشهرية</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{monthlyExpenses.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">-5% من الشهر الماضي</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(monthlyIncome - monthlyExpenses).toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">هذا الشهر</p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle>الحسابات المالية</CardTitle>
          <CardDescription>جميع الحسابات المسجلة في النظام</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{account.name}</h3>
                    <p className="text-sm text-muted-foreground">{getAccountTypeLabel(account.type)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{account.balance.toLocaleString()} {account.currency}</p>
                  <Badge variant="outline" className="text-green-600 border-green-600">نشط</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>المعاملات الأخيرة</CardTitle>
            <CardDescription>آخر العمليات المالية</CardDescription>
          </div>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="اختر الفترة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">آخر أسبوع</SelectItem>
              <SelectItem value="month">آخر شهر</SelectItem>
              <SelectItem value="quarter">آخر ربع</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 border-b">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    transaction.type === "income" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  }`}>
                    {transaction.type === "income" ? "+" : "-"}
                  </div>
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-muted-foreground">{transaction.account} • {transaction.date}</p>
                  </div>
                </div>
                <div className={`font-bold ${
                  transaction.type === "income" ? "text-green-600" : "text-red-600"
                }`}>
                  {transaction.amount > 0 ? "+" : ""}{transaction.amount.toLocaleString()} ر.س
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Accounts;