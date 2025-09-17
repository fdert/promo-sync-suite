import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp, TrendingDown, BarChart3, DollarSign, CalendarRange, FileText, Search, Download, Plus, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const FinancialReports = () => {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [financialData, setFinancialData] = useState({
    income: 0,
    expenses: 0,
    netProfit: 0,
    accountsReceivable: 0
  });

  // فلاتر زمنية للتقارير
  const [dateFilter, setDateFilter] = useState({
    period: 'current_month',
    startDate: '',
    endDate: ''
  });

  // حالة مودال إضافة المصروفات
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: '',
    customCategory: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    notes: ''
  });

  const { toast } = useToast();

  // فئات المصروفات المتاحة
  const expenseCategories = [
    { value: 'salaries', label: 'الرواتب' },
    { value: 'purchases', label: 'المشتريات' },
    { value: 'cash_expenses', label: 'مصاريف نقدية' },
    { value: 'withdrawals', label: 'مسحوبات' },
    { value: 'rent', label: 'الإيجار' },
    { value: 'utilities', label: 'الخدمات (كهرباء، ماء، إنترنت)' },
    { value: 'marketing', label: 'التسويق والإعلان' },
    { value: 'maintenance', label: 'الصيانة' },
    { value: 'transportation', label: 'المواصلات' },
    { value: 'office_supplies', label: 'مستلزمات المكتب' },
    { value: 'other', label: 'أخرى (يرجى التحديد)' }
  ];

  // طرق الدفع المتاحة
  const paymentMethods = [
    { value: 'نقدي', label: 'نقدي' },
    { value: 'تحويل بنكي', label: 'تحويل بنكي' },
    { value: 'الشبكة', label: 'بطاقة ائتمانية/الشبكة' },
    { value: 'شيك', label: 'شيك' },
    { value: 'أخرى', label: 'أخرى' }
  ];

  // دالة للحصول على تواريخ بداية ونهاية الفترة
  const getDateRange = (period: string, startDate?: string, endDate?: string) => {
    const now = new Date();
    let start: Date, end: Date;

    switch (period) {
      case 'current_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case 'current_year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      case 'custom':
        if (startDate && endDate) {
          start = new Date(startDate);
          end = new Date(endDate + 'T23:59:59');
        } else {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        }
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    return { start, end };
  };

  // جلب الحسابات
  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .order('account_type', { ascending: true });

      if (error) {
        console.error('Error fetching accounts:', error);
        return;
      }

      setAccounts(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // جلب بيانات المصروفات التفصيلية
  const fetchExpenses = async () => {
    try {
      const { start, end } = getDateRange(dateFilter.period, dateFilter.startDate, dateFilter.endDate);

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', start.toISOString().split('T')[0])
        .lte('date', end.toISOString().split('T')[0])
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

  // جلب البيانات المالية للفترة المحددة
  const fetchFinancialData = async () => {
    try {
      const { start, end } = getDateRange(dateFilter.period, dateFilter.startDate, dateFilter.endDate);

      // جلب الإيرادات من المدفوعات (لتطابق حسابات الإدارة)
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, payment_date, payment_type')
        .gte('payment_date', start.toISOString().split('T')[0])
        .lte('payment_date', end.toISOString().split('T')[0]);

      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
      }

      const income = (paymentsData || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);

      // جلب المصروفات
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('amount, date')
        .gte('date', start.toISOString().split('T')[0])
        .lte('date', end.toISOString().split('T')[0]);

      if (expensesError) {
        console.error('Error fetching expenses:', expensesError);
      }

      const expenses = (expensesData || []).reduce((sum, expense) => sum + (expense.amount || 0), 0);

      // حساب العملاء المدينون
      const { data: debtorsData, error: debtorsError } = await supabase
        .from('customer_outstanding_balances')
        .select('outstanding_balance');

      if (debtorsError) {
        console.error('Error fetching debtors:', debtorsError);
      }

      const accountsReceivable = (debtorsData || []).reduce((sum, customer) => sum + (customer.outstanding_balance || 0), 0);

      setFinancialData({
        income,
        expenses,
        netProfit: income - expenses,
        accountsReceivable
      });

    } catch (error) {
      console.error('Error fetching financial data:', error);
    }
  };

  // تحميل البيانات عند تحميل الصفحة
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAccounts(),
        fetchFinancialData(),
        fetchExpenses()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  // تحديث البيانات عند تغيير الفلتر
  useEffect(() => {
    fetchFinancialData();
    fetchExpenses();
  }, [dateFilter]);

  // تجميع الحسابات حسب النوع
  const accountsByType = accounts.reduce((acc: Record<string, any[]>, account) => {
    if (!acc[account.account_type]) {
      acc[account.account_type] = [];
    }
    acc[account.account_type].push(account);
    return acc;
  }, {});

  // إنشاء تقرير مالي
  const generateReport = () => {
    const reportData = {
      period: dateFilter.period,
      startDate: dateFilter.startDate,
      endDate: dateFilter.endDate,
      financial: financialData,
      accounts: accountsByType,
      timestamp: new Date().toISOString()
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `financial-report-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast({
      title: "تم التصدير",
      description: "تم تصدير التقرير المالي بنجاح",
    });
  };

  // دالة إضافة مصروف جديد
  const handleAddExpense = async () => {
    try {
      // التحقق من صحة البيانات
      if (!expenseForm.description || !expenseForm.amount || !expenseForm.category) {
        toast({
          title: "خطأ في البيانات",
          description: "يرجى ملء جميع الحقول المطلوبة",
          variant: "destructive",
        });
        return;
      }

      // التحقق من الفئة المخصصة إذا كانت مختارة
      if (expenseForm.category === 'other' && !expenseForm.customCategory) {
        toast({
          title: "خطأ في البيانات",
          description: "يرجى تحديد نوع المصروف عند اختيار 'أخرى'",
          variant: "destructive",
        });
        return;
      }

      // تحديد فئة المصروف النهائية
      const finalCategory = expenseForm.category === 'other' ? expenseForm.customCategory : 
        expenseCategories.find(cat => cat.value === expenseForm.category)?.label || expenseForm.category;

      // إنشاء رقم المصروف
      const { data: lastExpense } = await supabase
        .from('expenses')
        .select('expense_number')
        .order('created_at', { ascending: false })
        .limit(1);

      let expenseNumber = 'EXP-001';
      if (lastExpense && lastExpense.length > 0) {
        const lastNumber = parseInt(lastExpense[0].expense_number.split('-')[1]);
        expenseNumber = `EXP-${String(lastNumber + 1).padStart(3, '0')}`;
      }

      // إضافة المصروف إلى قاعدة البيانات
      const { error } = await supabase
        .from('expenses')
        .insert({
          expense_number: expenseNumber,
          description: expenseForm.description,
          amount: parseFloat(expenseForm.amount),
          category: finalCategory,
          date: expenseForm.date,
          payment_method: expenseForm.paymentMethod,
          notes: expenseForm.notes
        });

      if (error) {
        throw error;
      }

      // إعادة تحميل البيانات المالية
      await Promise.all([
        fetchFinancialData(),
        fetchExpenses()
      ]);

      // إعادة تعيين النموذج وإغلاق المودال
      setExpenseForm({
        description: '',
        amount: '',
        category: '',
        customCategory: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: '',
        notes: ''
      });
      setIsExpenseDialogOpen(false);

      toast({
        title: "تم الحفظ بنجاح",
        description: `تم إضافة المصروف برقم ${expenseNumber}`,
      });

    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: "خطأ في الحفظ",
        description: "فشل في إضافة المصروف، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">التقارير المالية</h1>
            <p className="text-muted-foreground">عرض تفصيلي للوضع المالي والحسابات</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  إضافة مصروف
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    إضافة مصروف جديد
                  </DialogTitle>
                  <DialogDescription>
                    قم بإدخال تفاصيل المصروف الجديد
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="description">وصف المصروف *</Label>
                      <Input
                        id="description"
                        value={expenseForm.description}
                        onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                        placeholder="مثال: راتب الموظف أحمد - يناير 2024"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="amount">المبلغ (ر.س) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                        placeholder="0.00"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">فئة المصروف *</Label>
                      <Select value={expenseForm.category} onValueChange={(value) => setExpenseForm({...expenseForm, category: value})}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="اختر فئة المصروف" />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseCategories.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {expenseForm.category === 'other' && (
                      <div>
                        <Label htmlFor="customCategory">تحديد نوع المصروف *</Label>
                        <Input
                          id="customCategory"
                          value={expenseForm.customCategory}
                          onChange={(e) => setExpenseForm({...expenseForm, customCategory: e.target.value})}
                          placeholder="حدد نوع المصروف"
                          className="mt-1"
                        />
                      </div>
                    )}

                    <div>
                      <Label htmlFor="date">تاريخ المصروف</Label>
                      <Input
                        id="date"
                        type="date"
                        value={expenseForm.date}
                        onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="paymentMethod">طريقة الدفع</Label>
                    <Select value={expenseForm.paymentMethod} onValueChange={(value) => setExpenseForm({...expenseForm, paymentMethod: value})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="اختر طريقة الدفع" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="notes">ملاحظات إضافية</Label>
                    <Textarea
                      id="notes"
                      value={expenseForm.notes}
                      onChange={(e) => setExpenseForm({...expenseForm, notes: e.target.value})}
                      placeholder="أي ملاحظات أو تفاصيل إضافية..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
                    إلغاء
                  </Button>
                  <Button onClick={handleAddExpense} className="gap-2">
                    <Plus className="h-4 w-4" />
                    إضافة المصروف
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Button onClick={generateReport} className="gap-2">
              <Download className="h-4 w-4" />
              تصدير التقرير
            </Button>
          </div>
        </div>

      {/* فلتر زمني */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5" />
            فلتر الفترة الزمنية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label htmlFor="period">الفترة الزمنية</Label>
              <Select value={dateFilter.period} onValueChange={(value) => setDateFilter({...dateFilter, period: value})}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="اختر الفترة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_month">الشهر الحالي</SelectItem>
                  <SelectItem value="last_month">الشهر الماضي</SelectItem>
                  <SelectItem value="current_year">السنة الحالية</SelectItem>
                  <SelectItem value="custom">فترة مخصصة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {dateFilter.period === 'custom' && (
              <>
                <div>
                  <Label htmlFor="startDate">من تاريخ</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={dateFilter.startDate}
                    onChange={(e) => setDateFilter({...dateFilter, startDate: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">إلى تاريخ</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={dateFilter.endDate}
                    onChange={(e) => setDateFilter({...dateFilter, endDate: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* الملخص المالي */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{financialData.income.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">
              {dateFilter.period === 'current_month' && 'هذا الشهر'}
              {dateFilter.period === 'last_month' && 'الشهر الماضي'}
              {dateFilter.period === 'current_year' && 'هذا العام'}
              {dateFilter.period === 'custom' && 'الفترة المحددة'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{financialData.expenses.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">
              {dateFilter.period === 'current_month' && 'هذا الشهر'}
              {dateFilter.period === 'last_month' && 'الشهر الماضي'}
              {dateFilter.period === 'current_year' && 'هذا العام'}
              {dateFilter.period === 'custom' && 'الفترة المحددة'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${financialData.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {financialData.netProfit.toLocaleString()} ر.س
            </div>
            <p className="text-xs text-muted-foreground">
              {financialData.netProfit >= 0 ? 'ربح' : 'خسارة'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العملاء المدينون</CardTitle>
            <DollarSign className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{financialData.accountsReceivable.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">إجمالي الديون</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="accounts">الحسابات</TabsTrigger>
          <TabsTrigger value="expenses">المصروفات</TabsTrigger>
          <TabsTrigger value="detailed">تقرير تفصيلي</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>الأداء المالي</CardTitle>
                <CardDescription>نسب الربحية والنمو</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>نسبة الربح:</span>
                    <span className={`font-bold ${financialData.income > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                      {financialData.income > 0 ? ((financialData.netProfit / financialData.income) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>نسبة المصروفات:</span>
                    <span className="font-bold text-destructive">
                      {financialData.income > 0 ? ((financialData.expenses / financialData.income) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>العملاء المدينون / الإيرادات:</span>
                    <span className="font-bold text-warning">
                      {financialData.income > 0 ? ((financialData.accountsReceivable / financialData.income) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>تحليل التدفق النقدي</CardTitle>
                <CardDescription>الوضع النقدي الحالي</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>الإيرادات الواردة:</span>
                    <span className="font-bold text-success">+{financialData.income.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>المصروفات الصادرة:</span>
                    <span className="font-bold text-destructive">-{financialData.expenses.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t-2">
                    <span className="font-bold">صافي التدفق النقدي:</span>
                    <span className={`font-bold text-lg ${financialData.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {financialData.netProfit >= 0 ? '+' : ''}{financialData.netProfit.toLocaleString()} ر.س
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <h2 className="text-xl font-semibold">أرصدة الحسابات</h2>
          
          {Object.entries(accountsByType).map(([type, accountList]: [string, any[]]) => (
            <Card key={type}>
              <CardHeader>
                <CardTitle>{type}</CardTitle>
                <CardDescription>
                  إجمالي الرصيد: {(accountList as any[]).reduce((sum, acc) => sum + (acc.balance || 0), 0).toLocaleString()} ر.س
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(accountList as any[]).map((account) => (
                    <div key={account.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{account.account_name}</h3>
                        <p className="text-sm text-muted-foreground">{account.description}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${account.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {account.balance?.toLocaleString()} ر.س
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                بيانات المصروفات
              </CardTitle>
              <CardDescription>
                جميع المصروفات المسجلة للفترة المحددة - عرض فقط
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد مصروفات مسجلة في هذه الفترة
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {expenses.map((expense) => (
                      <Card key={expense.id} className="border-l-4 border-l-destructive">
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-sm">{expense.expense_number}</h4>
                                <p className="text-sm text-muted-foreground">{expense.description}</p>
                              </div>
                              <span className="text-lg font-bold text-destructive">
                                {expense.amount?.toLocaleString()} ر.س
                              </span>
                            </div>
                            
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div className="flex justify-between">
                                <span>الفئة:</span>
                                <span className="font-medium">{expense.category}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>التاريخ:</span>
                                <span>{new Date(expense.date).toLocaleDateString('ar-SA')}</span>
                              </div>
                              {expense.payment_method && (
                                <div className="flex justify-between">
                                  <span>طريقة الدفع:</span>
                                  <span>{expense.payment_method}</span>
                                </div>
                              )}
                            </div>
                            
                            {expense.notes && (
                              <div className="mt-2 p-2 bg-muted rounded text-xs">
                                <strong>ملاحظات:</strong> {expense.notes}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">إجمالي المصروفات:</span>
                      <span className="text-xl font-bold text-destructive">
                        {expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0).toLocaleString()} ر.س
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      عدد المصروفات: {expenses.length} مصروف
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                تقرير مالي تفصيلي
              </CardTitle>
              <CardDescription>
                التقرير للفترة: {dateFilter.period === 'current_month' && 'الشهر الحالي'}
                {dateFilter.period === 'last_month' && 'الشهر الماضي'}
                {dateFilter.period === 'current_year' && 'السنة الحالية'}
                {dateFilter.period === 'custom' && `من ${dateFilter.startDate} إلى ${dateFilter.endDate}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* ملخص الأرباح والخسائر */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">قائمة الدخل</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b">
                      <span>إجمالي الإيرادات</span>
                      <span className="font-bold text-success">{financialData.income.toLocaleString()} ر.س</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span>إجمالي المصروفات</span>
                      <span className="font-bold text-destructive">({financialData.expenses.toLocaleString()}) ر.س</span>
                    </div>
                    <div className="flex justify-between py-3 border-t-2 border-gray-300">
                      <span className="font-bold text-lg">صافي الربح/الخسارة</span>
                      <span className={`font-bold text-xl ${financialData.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {financialData.netProfit.toLocaleString()} ر.س
                      </span>
                    </div>
                  </div>
                </div>

                {/* ملخص الميزانية */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">الميزانية العمومية</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-medium mb-2 text-success">الأصول</h4>
                      {accountsByType['أصول']?.map((account: any) => (
                        <div key={account.id} className="flex justify-between py-1">
                          <span className="text-sm">{account.account_name}</span>
                          <span className="text-sm font-medium">{account.balance?.toLocaleString()} ر.س</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-bold">
                          <span>إجمالي الأصول</span>
                          <span>{(accountsByType['أصول']?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0).toLocaleString()} ر.س</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2 text-destructive">الخصوم وحقوق الملكية</h4>
                      {accountsByType['خصوم']?.map((account: any) => (
                        <div key={account.id} className="flex justify-between py-1">
                          <span className="text-sm">{account.account_name}</span>
                          <span className="text-sm font-medium">{account.balance?.toLocaleString()} ر.س</span>
                        </div>
                      ))}
                      {accountsByType['حقوق ملكية']?.map((account: any) => (
                        <div key={account.id} className="flex justify-between py-1">
                          <span className="text-sm">{account.account_name}</span>
                          <span className="text-sm font-medium">{account.balance?.toLocaleString()} ر.س</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-bold">
                          <span>إجمالي الخصوم وحقوق الملكية</span>
                          <span>
                            {((accountsByType['خصوم']?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0) + 
                              (accountsByType['حقوق ملكية']?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0)).toLocaleString()} ر.س
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialReports;