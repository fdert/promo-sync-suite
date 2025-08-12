import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, TrendingDown, Receipt, ArrowUpDown, AlertCircle, Eye, FileText, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const FinancialIntegration = () => {
  const navigate = useNavigate();

  // جلب الإحصائيات المالية الموحدة
  const { data: financialStats, isLoading: statsLoading } = useQuery({
    queryKey: ['financial-stats-unified'],
    queryFn: async () => {
      // إحصائيات الطلبات والمدفوعات
      const { data: orderStats, error: orderError } = await supabase
        .from('order_payment_summary')
        .select('amount, calculated_paid_amount, remaining_amount');

      if (orderError) throw orderError;

      // إحصائيات الحسابات
      const { data: accounts, error: accountError } = await supabase
        .from('accounts')
        .select('account_type, balance')
        .eq('is_active', true);

      if (accountError) throw accountError;

      // إحصائيات المصروفات
      const { data: expenses, error: expenseError } = await supabase
        .from('expenses')
        .select('amount')
        .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      if (expenseError) throw expenseError;

      const totalOrderValue = orderStats?.reduce((sum, order) => sum + (order.amount || 0), 0) || 0;
      const totalPaidAmount = orderStats?.reduce((sum, order) => sum + (order.calculated_paid_amount || 0), 0) || 0;
      const totalRemainingAmount = orderStats?.reduce((sum, order) => sum + (order.remaining_amount || 0), 0) || 0;

      const totalAssets = accounts?.filter(acc => acc.account_type === 'أصول').reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;
      const totalLiabilities = accounts?.filter(acc => acc.account_type === 'خصوم').reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;
      const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;

      return {
        totalOrderValue,
        totalPaidAmount,
        totalRemainingAmount,
        totalAssets,
        totalLiabilities,
        totalExpenses,
        netIncome: totalPaidAmount - totalExpenses,
        cashFlow: totalAssets - totalLiabilities
      };
    }
  });

  // جلب أحدث القيود المحاسبية
  const { data: recentEntries } = useQuery({
    queryKey: ['recent-account-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_entries')
        .select(`
          *,
          accounts(account_name, account_type)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    }
  });

  // جلب أكبر العملاء المدينين
  const { data: topDebtors } = useQuery({
    queryKey: ['top-debtors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_order_balances')
        .select('*')
        .gt('outstanding_balance', 0)
        .order('outstanding_balance', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">جاري تحميل البيانات المالية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">نظرة شاملة على الوضع المالي</h1>
          <p className="text-muted-foreground">ربط الحسابات المحاسبية مع مدفوعات الطلبات والمصروفات</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/admin/accounts')} variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            الحسابات التفصيلية
          </Button>
          <Button onClick={() => navigate('/admin/financial-movements')} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            التقارير المالية
          </Button>
        </div>
      </div>

      {/* الإحصائيات المالية الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              إجمالي قيمة الطلبات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(financialStats?.totalOrderValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              إجمالي قيمة جميع الطلبات
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              المدفوعات المحصلة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(financialStats?.totalPaidAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              المبالغ المدفوعة من العملاء
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              المبالغ المتبقية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(financialStats?.totalRemainingAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              المبالغ غير المحصلة
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              المصروفات الشهرية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(financialStats?.totalExpenses || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              مصروفات الشهر الحالي
            </p>
          </CardContent>
        </Card>
      </div>

      {/* المؤشرات المالية */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              مؤشرات الأداء المالي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="font-medium">صافي الدخل</span>
              <span className={`font-bold ${(financialStats?.netIncome || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(financialStats?.netIncome || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="font-medium">إجمالي الأصول</span>
              <span className="font-bold text-blue-600">
                {formatCurrency(financialStats?.totalAssets || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="font-medium">إجمالي الخصوم</span>
              <span className="font-bold text-orange-600">
                {formatCurrency(financialStats?.totalLiabilities || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="font-medium">التدفق النقدي</span>
              <span className={`font-bold ${(financialStats?.cashFlow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(financialStats?.cashFlow || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              أكبر العملاء المدينين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topDebtors && topDebtors.length > 0 ? (
                topDebtors.map((debtor, index) => (
                  <div
                    key={debtor.customer_id}
                    className="flex justify-between items-center p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{debtor.customer_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {debtor.total_orders_count} طلب • آخر استحقاق: {debtor.latest_due_date ? new Date(debtor.latest_due_date).toLocaleDateString('ar') : 'غير محدد'}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-red-600">
                        {formatCurrency(debtor.outstanding_balance || 0)}
                      </p>
                      <Badge variant="destructive" className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  لا توجد مديونيات حالياً
                </p>
              )}
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => navigate('/admin/accounts')}
            >
              عرض جميع المدينين
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* أحدث القيود المحاسبية */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            أحدث القيود المحاسبية
          </CardTitle>
          <CardDescription>
            آخر 10 قيود محاسبية مرتبطة بالطلبات والمدفوعات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>الحساب</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead>مدين</TableHead>
                <TableHead>دائن</TableHead>
                <TableHead>النوع</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentEntries && recentEntries.length > 0 ? (
                recentEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">
                      {new Date(entry.created_at).toLocaleDateString('ar')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{entry.accounts?.account_name}</p>
                        <p className="text-xs text-muted-foreground">{entry.accounts?.account_type}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                    <TableCell className="text-green-600 font-medium">
                      {(entry.debit_amount || 0) > 0 ? formatCurrency(entry.debit_amount || 0) : '-'}
                    </TableCell>
                    <TableCell className="text-red-600 font-medium">
                      {(entry.credit_amount || 0) > 0 ? formatCurrency(entry.credit_amount || 0) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.reference_type}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                    لا توجد قيود محاسبية
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex justify-between mt-4">
            <Button 
              variant="outline"
              onClick={() => navigate('/admin/accounts')}
            >
              عرض جميع القيود
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/employee/order-payments-list')}
            >
              إدارة مدفوعات الطلبات
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialIntegration;