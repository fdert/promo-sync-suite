import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarIcon, AlertTriangle, Users, DollarSign, FileText, TrendingDown, ClipboardList, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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

interface OrderDetails {
  id: string;
  order_number: string;
  service_name: string;
  amount: number;
  status: string;
  created_at: string;
  due_date: string;
}

interface PaymentDetails {
  id: string;
  amount: number;
  payment_type: string;
  payment_date: string;
  invoice_id: string;
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
  const [customerOrders, setCustomerOrders] = useState<Record<string, OrderDetails[]>>({});
  const [customerPayments, setCustomerPayments] = useState<Record<string, PaymentDetails[]>>({});
  const [accountingSummary, setAccountingSummary] = useState<AccountingSummary>({
    total_invoiced: 0,
    total_paid: 0,
    total_outstanding: 0,
    account_balance: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

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
        
        // جلب طلبات العملاء المدينون
        const customerIds = balancesData.map(customer => customer.customer_id).filter(Boolean);
        await fetchCustomerOrders(customerIds);
        await fetchCustomerPayments(customerIds);
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
        .from('invoice_payment_summary')
        .select('*')
        .gt('remaining_amount', 0.01);

      if (summaryData && summaryData.length > 0) {
        const totalInvoiced = summaryData.reduce((sum, inv) => sum + inv.total_amount, 0);
        const totalPaid = summaryData.reduce((sum, inv) => sum + (inv.calculated_paid_amount || 0), 0);
        const totalOutstanding = summaryData.reduce((sum, inv) => sum + (inv.remaining_amount || 0), 0);
        
        // جلب رصيد العملاء المدينين من الحسابات
        const { data: accountData } = await supabase
          .from('accounts')
          .select('balance')
          .eq('account_name', 'العملاء المدينون')
          .single();
        
        setAccountingSummary({
          total_invoiced: totalInvoiced,
          total_paid: totalPaid,
          total_outstanding: totalOutstanding,
          account_balance: accountData?.balance || 0
        });
      }

    } catch (error) {
      console.error('Error fetching accounts receivable data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerOrders = async (customerIds: string[]) => {
    try {
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, order_number, service_name, amount, status, created_at, due_date, customer_id')
        .in('customer_id', customerIds)
        .order('created_at', { ascending: false });

      if (ordersData) {
        const ordersGrouped = ordersData.reduce((acc, order) => {
          if (!acc[order.customer_id]) {
            acc[order.customer_id] = [];
          }
          acc[order.customer_id].push(order);
          return acc;
        }, {} as Record<string, OrderDetails[]>);
        
        setCustomerOrders(ordersGrouped);
      }
    } catch (error) {
      console.error('Error fetching customer orders:', error);
    }
  };

  const fetchCustomerPayments = async (customerIds: string[]) => {
    try {
      const { data: paymentsData } = await supabase
        .from('payments')
        .select(`
          id, 
          amount, 
          payment_type, 
          payment_date, 
          invoice_id,
          invoices!inner(customer_id)
        `)
        .in('invoices.customer_id', customerIds)
        .order('payment_date', { ascending: false });

      if (paymentsData) {
        const paymentsGrouped = paymentsData.reduce((acc, payment) => {
          const customerId = (payment.invoices as any).customer_id;
          if (!acc[customerId]) {
            acc[customerId] = [];
          }
          acc[customerId].push({
            id: payment.id,
            amount: payment.amount,
            payment_type: payment.payment_type,
            payment_date: payment.payment_date,
            invoice_id: payment.invoice_id
          });
          return acc;
        }, {} as Record<string, PaymentDetails[]>);
        
        setCustomerPayments(paymentsGrouped);
      }
    } catch (error) {
      console.error('Error fetching customer payments:', error);
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
                <TableHead>الإجراءات</TableHead>
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
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedCustomerId(customer.customer_id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          التفاصيل
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            تفاصيل العميل: {customer.customer_name}
                          </DialogTitle>
                          <DialogDescription>
                            عرض تفاصيل الطلبات والمدفوعات والفواتير المرتبطة بالعميل
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedCustomerId && (
                          <div className="space-y-6">
                            {/* طلبات العميل */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                  <ClipboardList className="h-4 w-4" />
                                  الطلبات ({customerOrders[selectedCustomerId]?.length || 0})
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>رقم الطلب</TableHead>
                                      <TableHead>الخدمة</TableHead>
                                      <TableHead>المبلغ</TableHead>
                                      <TableHead>الحالة</TableHead>
                                      <TableHead>تاريخ الإنشاء</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {customerOrders[selectedCustomerId]?.slice(0, 5).map((order) => (
                                      <TableRow key={order.id}>
                                        <TableCell className="font-medium">{order.order_number}</TableCell>
                                        <TableCell>{order.service_name}</TableCell>
                                        <TableCell>{order.amount.toLocaleString()} ر.س</TableCell>
                                        <TableCell>
                                          <Badge variant="outline">{order.status}</Badge>
                                        </TableCell>
                                        <TableCell>
                                          {format(new Date(order.created_at), 'dd/MM/yyyy', { locale: ar })}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </CardContent>
                            </Card>

                            {/* مدفوعات العميل */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                  <DollarSign className="h-4 w-4" />
                                  المدفوعات ({customerPayments[selectedCustomerId]?.length || 0})
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>المبلغ</TableHead>
                                      <TableHead>نوع الدفع</TableHead>
                                      <TableHead>تاريخ الدفع</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {customerPayments[selectedCustomerId]?.slice(0, 5).map((payment) => (
                                      <TableRow key={payment.id}>
                                        <TableCell className="font-medium text-green-600">
                                          {payment.amount.toLocaleString()} ر.س
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="secondary">{payment.payment_type}</Badge>
                                        </TableCell>
                                        <TableCell>
                                          {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ar })}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
};

export default AccountsReceivableReview;