import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, TrendingUp, TrendingDown, DollarSign, CreditCard, Receipt, CalendarRange } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Accounts = () => {
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    category: "",
    date: new Date().toISOString().split('T')[0],
    payment_method: "",
    notes: ""
  });

  const { toast } = useToast();

  // جلب المصروفات من قاعدة البيانات
  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching expenses:', error);
        return;
      }

      setExpenses(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // جلب الفواتير للحصول على الإيرادات
  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('status', 'مدفوع')
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('Error fetching invoices:', error);
        return;
      }

      setInvoices(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchExpenses(), fetchInvoices()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // إضافة مصروف جديد
  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount || !newExpense.category) {
      toast({
        title: "خطأ",
        description: "يرجى ملء الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: expenseNumber } = await supabase.rpc('generate_expense_number');
      
      const { error } = await supabase
        .from('expenses')
        .insert({
          expense_number: expenseNumber,
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          category: newExpense.category,
          date: newExpense.date,
          payment_method: newExpense.payment_method,
          notes: newExpense.notes
        });

      if (error) {
        console.error('Error adding expense:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في إضافة المصروف",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "نجح",
        description: "تم إضافة المصروف بنجاح",
      });

      setIsAddExpenseOpen(false);
      setNewExpense({
        description: "",
        amount: "",
        category: "",
        date: new Date().toISOString().split('T')[0],
        payment_method: "",
        notes: ""
      });
      fetchExpenses();
    } catch (error) {
      console.error('Error:', error);
    }
  };
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

  // حساب الإحصائيات
  const monthlyIncome = invoices
    .filter(invoice => {
      const paymentDate = new Date(invoice.payment_date);
      const currentMonth = new Date();
      return paymentDate.getMonth() === currentMonth.getMonth() && 
             paymentDate.getFullYear() === currentMonth.getFullYear();
    })
    .reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);

  const monthlyExpenses = expenses
    .filter(expense => {
      const expenseDate = new Date(expense.date);
      const currentMonth = new Date();
      return expenseDate.getMonth() === currentMonth.getMonth() && 
             expenseDate.getFullYear() === currentMonth.getFullYear();
    })
    .reduce((sum, expense) => sum + (expense.amount || 0), 0);

  const totalBalance = monthlyIncome - monthlyExpenses;
  const netProfit = monthlyIncome - monthlyExpenses;

  if (loading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة الحسابات</h1>
          <p className="text-muted-foreground">متابعة الحسابات المالية والمعاملات</p>
        </div>
        <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة مصروف جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إضافة مصروف جديد</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="description">وصف المصروف</Label>
                  <Input
                    id="description"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                    placeholder="وصف المصروف..."
                  />
                </div>
                <div>
                  <Label htmlFor="amount">المبلغ (ر.س)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">الفئة</Label>
                  <Select value={newExpense.category} onValueChange={(value) => setNewExpense({...newExpense, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الفئة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="مكتبية">مصروفات مكتبية</SelectItem>
                      <SelectItem value="تشغيلية">مصروفات تشغيلية</SelectItem>
                      <SelectItem value="تسويق">تسويق وإعلان</SelectItem>
                      <SelectItem value="صيانة">صيانة وإصلاح</SelectItem>
                      <SelectItem value="مواصلات">مواصلات</SelectItem>
                      <SelectItem value="أخرى">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date">التاريخ</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="payment_method">طريقة الدفع</Label>
                <Select value={newExpense.payment_method} onValueChange={(value) => setNewExpense({...newExpense, payment_method: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر طريقة الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="نقدي">نقدي</SelectItem>
                    <SelectItem value="بنكي">تحويل بنكي</SelectItem>
                    <SelectItem value="بطاقة ائتمان">بطاقة ائتمان</SelectItem>
                    <SelectItem value="شيك">شيك</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={newExpense.notes}
                  onChange={(e) => setNewExpense({...newExpense, notes: e.target.value})}
                  placeholder="ملاحظات إضافية..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddExpenseOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleAddExpense}>
                  إضافة المصروف
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
            <p className="text-xs text-muted-foreground">صافي الرصيد</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الإيرادات الشهرية</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{monthlyIncome.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">+12% من الشهر الماضي</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المصروفات الشهرية</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{monthlyExpenses.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">-5% من الشهر الماضي</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{netProfit.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">هذا الشهر</p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle>المصروفات الأخيرة</CardTitle>
          <CardDescription>آخر المصروفات المسجلة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expenses.slice(0, 5).map((expense) => (
              <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                    <Receipt className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-medium">{expense.description}</h3>
                    <p className="text-sm text-muted-foreground">{expense.category} • {expense.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-destructive">-{expense.amount?.toLocaleString()} ر.س</p>
                  <p className="text-sm text-muted-foreground">{expense.expense_number}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Deferred Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>الفواتير الآجلة</CardTitle>
          <CardDescription>الفواتير المؤجلة الدفع</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoices.filter(invoice => invoice.is_deferred).slice(0, 5).map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-warning/10 text-warning">
                    <CalendarRange className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{invoice.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">تاريخ الاستحقاق: {invoice.due_date}</p>
                  </div>
                </div>
                <div className="font-bold text-warning">
                  {invoice.total_amount?.toLocaleString()} ر.س
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