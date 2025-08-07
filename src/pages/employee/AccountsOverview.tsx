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

interface UnpaidOrder {
  order_id: string;
  order_number: string;
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
  order_id: string;
}

const AccountsOverview = () => {
  const [customerBalances, setCustomerBalances] = useState<CustomerBalance[]>([]);
  const [unpaidOrders, setUnpaidOrders] = useState<UnpaidOrder[]>([]);
  const [customerOrders, setCustomerOrders] = useState<Record<string, OrderDetails[]>>({});
  const [customerPayments, setCustomerPayments] = useState<Record<string, PaymentDetails[]>>({});
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

      // جلب الطلبات غير المدفوعة مع تفاصيلها من الـ view الجديد
      const { data: ordersData } = await supabase
        .from('order_payment_summary')
        .select(`
          id,
          order_number,
          amount,
          calculated_paid_amount,
          remaining_amount,
          due_date,
          status,
          customer_id
        `)
        .gt('remaining_amount', 0);

      // جلب أسماء العملاء
      const customerIds = [...new Set(ordersData?.map(order => order.customer_id).filter(Boolean))];
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, name')
        .in('id', customerIds);

      if (ordersData && customersData) {
        const customerMap = new Map(customersData.map(customer => [customer.id, customer.name]));
        
        const formattedOrders = ordersData.map(order => {
          const dueDate = new Date(order.due_date);
          const today = new Date();
          const daysOverdue = differenceInDays(today, dueDate);
          
          return {
            order_id: order.id,
            order_number: order.order_number,
            customer_name: customerMap.get(order.customer_id) || 'غير محدد',
            total_amount: order.amount,
            paid_amount: order.calculated_paid_amount || 0,
            remaining_amount: order.remaining_amount,
            due_date: order.due_date,
            days_overdue: daysOverdue > 0 ? daysOverdue : 0,
            status: order.status
          };
        });
        
        setUnpaidOrders(formattedOrders.sort((a, b) => b.days_overdue - a.days_overdue));
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
          order_id,
          orders!inner(customer_id)
        `)
        .in('orders.customer_id', customerIds)
        .order('payment_date', { ascending: false });

      if (paymentsData) {
        const paymentsGrouped = paymentsData.reduce((acc, payment) => {
          const customerId = (payment.orders as any).customer_id;
          if (!acc[customerId]) {
            acc[customerId] = [];
          }
          acc[customerId].push({
            id: payment.id,
            amount: payment.amount,
            payment_type: payment.payment_type,
            payment_date: payment.payment_date,
            order_id: payment.order_id
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">العملاء المدينون</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
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
        <h1 className="text-3xl font-bold text-foreground">العملاء المدينون</h1>
      </div>

      {/* ملخص سريع */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عدد العملاء المدينون</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {customerBalances.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلبات غير المدفوعة</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {unpaidOrders.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المتأخرة أكثر من 30 يوم</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {unpaidOrders.filter(order => order.days_overdue > 30).length}
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
            العملاء الذين لديهم مبالغ مستحقة مع إمكانية عرض تفاصيل الطلبات والمدفوعات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم العميل</TableHead>
                <TableHead>المبلغ المستحق</TableHead>
                <TableHead>عدد الطلبات</TableHead>
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
                    <Badge variant="secondary">{customer.unpaid_invoices_count} طلب</Badge>
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
                             عرض تفاصيل الطلبات والمدفوعات المرتبطة بالعميل
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

      {/* الطلبات غير المدفوعة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            الطلبات غير المدفوعة
          </CardTitle>
          <CardDescription>
            مرتبة حسب الأولوية (المتأخرة أولاً)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الطلب</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>المبلغ الإجمالي</TableHead>
                <TableHead>المبلغ المدفوع</TableHead>
                <TableHead>المبلغ المتبقي</TableHead>
                <TableHead>تاريخ الاستحقاق</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unpaidOrders.map((order) => {
                const status = getOverdueStatus(order.days_overdue);
                return (
                  <TableRow key={order.order_id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>{order.customer_name}</TableCell>
                    <TableCell>{order.total_amount.toLocaleString()} ر.س</TableCell>
                    <TableCell className="text-green-600">
                      {order.paid_amount.toLocaleString()} ر.س
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-orange-600">
                        {order.remaining_amount.toLocaleString()} ر.س
                      </span>
                    </TableCell>
                    <TableCell>
                      {format(new Date(order.due_date), 'dd/MM/yyyy', { locale: ar })}
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

export default AccountsOverview;