// @ts-nocheck
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Search, Eye, DollarSign, TrendingUp, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  customer: {
    name: string;
  };
  service_types?: {
    name: string;
  };
  totalPaid: number;
  remainingAmount: number;
}

const EmployeeOrderPaymentsList = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter, paymentFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          status,
          created_at,
          customers (
            name
          ),
          service_types (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // حساب المدفوعات لكل طلب
      const ordersWithPayments = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: payments } = await supabase
            .from('payments')
            .select('amount')
            .eq('order_id', order.id);

          const totalPaid = (payments || []).reduce((sum, payment) => sum + Number((payment as any)?.amount || 0), 0);
          const remainingAmount = Number(order.total_amount || 0) - totalPaid;

          return {
            ...order,
            customer: order.customers as any,
            service_types: order.service_types as any,
            totalPaid,
            remainingAmount
          };
        })
      );

      setOrders(ordersWithPayments);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // فلترة بالبحث
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.service_types?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // فلترة بحالة الطلب
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // فلترة بحالة الدفع
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(order => {
        if (paymentFilter === 'paid') return order.remainingAmount <= 0;
        if (paymentFilter === 'partial') return order.totalPaid > 0 && order.remainingAmount > 0;
        if (paymentFilter === 'unpaid') return order.totalPaid === 0;
        return true;
      });
    }

    setFilteredOrders(filtered);
  };

  const getPaymentStatus = (totalPaid: number, amount: number) => {
    if (totalPaid >= amount) return { text: 'مدفوع بالكامل', variant: 'default' as const };
    if (totalPaid > 0) return { text: 'مدفوع جزئياً', variant: 'secondary' as const };
    return { text: 'غير مدفوع', variant: 'destructive' as const };
  };

  const getPaymentProgress = (totalPaid: number, amount: number) => {
    return Math.min((totalPaid / amount) * 100, 100);
  };

  // إحصائيات سريعة
  const totalOrders = orders.length;
  const paidOrders = orders.filter(order => order.remainingAmount <= 0).length;
  const partiallyPaidOrders = orders.filter(order => order.totalPaid > 0 && order.remainingAmount > 0).length;
  const unpaidOrders = orders.filter(order => order.totalPaid === 0).length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalPaid, 0);
  const pendingAmount = orders.reduce((sum, order) => sum + order.remainingAmount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">إدارة مدفوعات الطلبات</h1>
        <p className="text-muted-foreground">
          متابعة وإدارة مدفوعات الطلبات والحسابات المالية
        </p>
      </div>

      {/* فلاتر البحث */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث برقم الطلب أو اسم العميل أو الخدمة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="حالة الطلب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="جديد">جديد</SelectItem>
                <SelectItem value="مؤكد">مؤكد</SelectItem>
                <SelectItem value="قيد التنفيذ">قيد التنفيذ</SelectItem>
                <SelectItem value="مكتمل">مكتمل</SelectItem>
                <SelectItem value="ملغي">ملغي</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="حالة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع حالات الدفع</SelectItem>
                <SelectItem value="paid">مدفوع بالكامل</SelectItem>
                <SelectItem value="partial">مدفوع جزئياً</SelectItem>
                <SelectItem value="unpaid">غير مدفوع</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* جدول الطلبات */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الطلبات ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الطلب</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>الخدمة</TableHead>
                <TableHead>المبلغ الإجمالي</TableHead>
                <TableHead>المدفوع</TableHead>
                <TableHead>المتبقي</TableHead>
                <TableHead>حالة الدفع</TableHead>
                <TableHead>حالة الطلب</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    لا توجد طلبات تطابق المعايير المحددة
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => {
                  const paymentStatus = getPaymentStatus(order.totalPaid, Number(order.total_amount || 0));
                  const progress = getPaymentProgress(order.totalPaid, Number(order.total_amount || 0));
                  
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.order_number}</TableCell>
                      <TableCell>
                      <div>
                        <p className="font-medium">{order.customer.name}</p>
                      </div>
                      </TableCell>
                      <TableCell>{order.service_types?.name || 'غير محدد'}</TableCell>
                      <TableCell className="font-medium">
                        {Number(order.total_amount || 0).toLocaleString()} ر.س
                      </TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {order.totalPaid.toLocaleString()} ر.س
                      </TableCell>
                      <TableCell className="text-red-600 font-medium">
                        {order.remainingAmount.toLocaleString()} ر.س
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={paymentStatus.variant}>{paymentStatus.text}</Badge>
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div
                              className="bg-green-600 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-muted-foreground">{progress.toFixed(0)}%</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.created_at), 'dd/MM/yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/employee/order-payments/${order.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            إدارة المدفوعات
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeOrderPaymentsList;