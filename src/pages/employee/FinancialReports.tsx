import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, BarChart3, DollarSign, CalendarRange, FileText, Search, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const FinancialReports = () => {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
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

  const { toast } = useToast();

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
        fetchFinancialData()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  // تحديث البيانات عند تغيير الفلتر
  useEffect(() => {
    fetchFinancialData();
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
        <Button onClick={generateReport} className="gap-2">
          <Download className="h-4 w-4" />
          تصدير التقرير
        </Button>
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="accounts">الحسابات</TabsTrigger>
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