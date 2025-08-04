import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarIcon, AlertTriangle, Users, DollarSign, FileText, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';

interface CustomerBalance {
  customer_id: string;
  customer_name: string;
  outstanding_balance: number;
  unpaid_invoices_count: number;
  earliest_due_date: string;
  latest_due_date: string;
}

interface UnpaidInvoice {
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  days_overdue: number;
  status: string;
}

interface AccountingSummary {
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  account_balance: number;
}

const AccountsReceivableReview = () => {
  const [customerBalances, setCustomerBalances] = useState<CustomerBalance[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([]);
  const [accountingSummary, setAccountingSummary] = useState<AccountingSummary>({
    total_invoiced: 0,
    total_paid: 0,
    total_outstanding: 0,
    account_balance: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccountsReceivableData();
  }, []);

  const fetchAccountsReceivableData = async () => {
    try {
      setLoading(true);

      // جلب أرصدة العملاء المدينون
      const { data: balancesData } = await supabase
        .from('customer_outstanding_balances')
        .select('*');

      if (balancesData) {
        setCustomerBalances(balancesData);
      }

      // جلب الفواتير غير المدفوعة مع تفاصيلها من الـ view الجديد
      const { data: invoicesData } = await supabase
        .from('invoice_payment_summary')
        .select(`
          id,
          invoice_number,
          total_amount,
          calculated_paid_amount,
          remaining_amount,
          due_date,
          status,
          customer_id
        `)
        .gt('remaining_amount', 0);

      // جلب أسماء العملاء
      const customerIds = [...new Set(invoicesData?.map(inv => inv.customer_id).filter(Boolean))];
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, name')
        .in('id', customerIds);

      if (invoicesData && customersData) {
        const customerMap = new Map(customersData.map(customer => [customer.id, customer.name]));
        
        const formattedInvoices = invoicesData.map(invoice => {
          const dueDate = new Date(invoice.due_date);
          const today = new Date();
          const daysOverdue = differenceInDays(today, dueDate);
          
          return {
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            customer_name: customerMap.get(invoice.customer_id) || 'غير محدد',
            total_amount: invoice.total_amount,
            paid_amount: invoice.calculated_paid_amount || 0,
            remaining_amount: invoice.remaining_amount,
            due_date: invoice.due_date,
            days_overdue: daysOverdue > 0 ? daysOverdue : 0,
            status: invoice.status
          };
        });
        
        setUnpaidInvoices(formattedInvoices.sort((a, b) => b.days_overdue - a.days_overdue));
      }

      // جلب ملخص الحسابات
      const { data: summaryData } = await supabase
        .from('account_entries')
        .select(`
          debit_amount,
          credit_amount,
          accounts!inner(account_name, account_type)
        `)
        .eq('accounts.account_name', 'العملاء المدينون');

      const { data: accountData } = await supabase
        .from('accounts')
        .select('balance')
        .eq('account_name', 'العملاء المدينون')
        .single();

      if (summaryData && accountData) {
        const totalInvoiced = summaryData.reduce((sum, entry) => sum + (entry.debit_amount || 0), 0);
        const totalPaid = summaryData.reduce((sum, entry) => sum + (entry.credit_amount || 0), 0);
        
        setAccountingSummary({
          total_invoiced: totalInvoiced,
          total_paid: totalPaid,
          total_outstanding: totalInvoiced - totalPaid,
          account_balance: accountData.balance
        });
      }

    } catch (error) {
      console.error('Error fetching accounts receivable data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOverdueStatus = (daysOverdue: number) => {
    if (daysOverdue === 0) return { label: 'في الموعد', color: 'bg-green-100 text-green-800' };
    if (daysOverdue <= 30) return { label: `متأخر ${daysOverdue} يوم`, color: 'bg-yellow-100 text-yellow-800' };
    if (daysOverdue <= 60) return { label: `متأخر ${daysOverdue} يوم`, color: 'bg-orange-100 text-orange-800' };
    return { label: `متأخر ${daysOverdue} يوم`, color: 'bg-red-100 text-red-800' };
  };

  const syncAccountBalance = async () => {
    try {
      const { error } = await supabase.rpc('calculate_accounts_receivable_balance');
      if (!error) {
        // إعادة تحديث البيانات
        await fetchAccountsReceivableData();
      }
    } catch (error) {
      console.error('Error syncing account balance:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">مراجعة العملاء المدينون</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">مراجعة العملاء المدينون</h1>
        <Button onClick={syncAccountBalance} variant="outline">
          <TrendingDown className="h-4 w-4 mr-2" />
          مزامنة الأرصدة
        </Button>
      </div>

      {/* ملخص الحسابات */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الفواتير</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {accountingSummary.total_invoiced.toLocaleString()} ر.س
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المدفوعات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {accountingSummary.total_paid.toLocaleString()} ر.س
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المبلغ المستحق</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {accountingSummary.total_outstanding.toLocaleString()} ر.س
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">رصيد الحساب</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {accountingSummary.account_balance.toLocaleString()} ر.س
            </div>
          </CardContent>
        </Card>
      </div>

      {/* أرصدة العملاء */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            أرصدة العملاء المدينون
          </CardTitle>
          <CardDescription>
            العملاء الذين لديهم مبالغ مستحقة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم العميل</TableHead>
                <TableHead>المبلغ المستحق</TableHead>
                <TableHead>عدد الفواتير</TableHead>
                <TableHead>أقرب استحقاق</TableHead>
                <TableHead>آخر استحقاق</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerBalances.map((customer) => (
                <TableRow key={customer.customer_id}>
                  <TableCell className="font-medium">{customer.customer_name}</TableCell>
                  <TableCell>
                    <span className="font-bold text-orange-600">
                      {customer.outstanding_balance.toLocaleString()} ر.س
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{customer.unpaid_invoices_count} فاتورة</Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(customer.earliest_due_date), 'dd/MM/yyyy', { locale: ar })}
                  </TableCell>
                  <TableCell>
                    {format(new Date(customer.latest_due_date), 'dd/MM/yyyy', { locale: ar })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* الفواتير غير المدفوعة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            الفواتير غير المدفوعة
          </CardTitle>
          <CardDescription>
            مرتبة حسب الأولوية (المتأخرة أولاً)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>المبلغ الإجمالي</TableHead>
                <TableHead>المبلغ المدفوع</TableHead>
                <TableHead>المبلغ المتبقي</TableHead>
                <TableHead>تاريخ الاستحقاق</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unpaidInvoices.map((invoice) => {
                const status = getOverdueStatus(invoice.days_overdue);
                return (
                  <TableRow key={invoice.invoice_id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.customer_name}</TableCell>
                    <TableCell>{invoice.total_amount.toLocaleString()} ر.س</TableCell>
                    <TableCell className="text-green-600">
                      {invoice.paid_amount.toLocaleString()} ر.س
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-orange-600">
                        {invoice.remaining_amount.toLocaleString()} ر.س
                      </span>
                    </TableCell>
                    <TableCell>
                      {format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: ar })}
                    </TableCell>
                    <TableCell>
                      <Badge className={status.color} variant="secondary">
                        {status.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountsReceivableReview;