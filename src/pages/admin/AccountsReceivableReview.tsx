// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarIcon, AlertTriangle, Users, DollarSign, FileText, TrendingDown, ClipboardList, Eye, Download, Printer, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
  order_id: string;
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
  const [customerPhones, setCustomerPhones] = useState<Record<string, string>>({});
  
  // Outstanding balance WhatsApp template (from message_templates)
  const [outstandingTemplate, setOutstandingTemplate] = useState<string | null>(null);

  useEffect(() => {
    fetchAccountsReceivableData();
  }, []);

  // Load template once
  useEffect(() => {
    const loadTemplate = async () => {
      const { data } = await supabase
        .from('message_templates')
        .select('content')
        .eq('name', 'outstanding_balance_report')
        .eq('is_active', true)
        .maybeSingle();
      if (data?.content) setOutstandingTemplate(data.content as string);
    };
    loadTemplate();
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
        
        // جلب أرقام الجوال
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, whatsapp, phone')
          .in('id', customerIds);
        
        if (customersData) {
          const phonesMap: Record<string, string> = {};
          customersData.forEach(customer => {
            phonesMap[customer.id] = customer.whatsapp || customer.phone || '-';
          });
          setCustomerPhones(phonesMap);
        }
        
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

      // جلب ملخص الحسابات من مدفوعات الطلبات
      const { data: summaryData } = await supabase
        .from('order_payment_summary')
        .select('*');

      if (summaryData && summaryData.length > 0) {
        const totalOrdered = summaryData.reduce((sum, order) => sum + order.amount, 0);
        const totalPaid = summaryData.reduce((sum, order) => sum + (order.calculated_paid_amount || 0), 0);
        const totalOutstanding = summaryData.reduce((sum, order) => sum + (order.remaining_amount || 0), 0);
        
        // حساب رصيد العملاء المدينين من مدفوعات الطلبات
        const actualReceivable = Math.max(0, totalOutstanding);
        
        setAccountingSummary({
          total_invoiced: totalOrdered,
          total_paid: totalPaid,
          total_outstanding: actualReceivable,
          account_balance: actualReceivable
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

  const exportToPDF = async () => {
    try {
      const doc = new jsPDF();
      
      // عنوان التقرير
      doc.text('تقرير أرصدة العملاء المدينون', 105, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`التاريخ: ${format(new Date(), 'dd/MM/yyyy', { locale: ar })}`, 105, 22, { align: 'center' });
      
      // ملخص الأرصدة
      doc.setFontSize(12);
      doc.text('ملخص الأرصدة', 14, 35);
      
      const summaryData = [
        ['إجمالي الطلبات', `${accountingSummary.total_invoiced.toLocaleString()} ر.س`],
        ['إجمالي المدفوعات', `${accountingSummary.total_paid.toLocaleString()} ر.س`],
        ['المبلغ المستحق', `${accountingSummary.total_outstanding.toLocaleString()} ر.س`],
        ['رصيد الحساب', `${accountingSummary.account_balance.toLocaleString()} ر.س`]
      ];
      
      autoTable(doc, {
        startY: 40,
        head: [['البيان', 'المبلغ']],
        body: summaryData,
        theme: 'grid',
        styles: { font: 'helvetica', halign: 'right' },
        headStyles: { fillColor: [41, 128, 185] }
      });
      
      // جلب الطلبات لحساب المتأخرة أكثر من شهر
      const { data: ordersData } = await supabase
        .from('order_payment_summary')
        .select('*')
        .gt('balance', 0);
      
      const overdueOrders = ordersData?.filter(order => {
        const dueDate = order.created_at ? new Date(order.created_at) : null;
        if (!dueDate) return false;
        const daysOverdue = differenceInDays(new Date(), dueDate);
        return daysOverdue > 30;
      }) || [];
      
      // تفاصيل العملاء
      doc.setFontSize(12);
      const startY = (doc as any).lastAutoTable.finalY + 15;
      doc.text(`تفاصيل العملاء المدينون (${customerBalances.length})`, 14, startY);
      doc.text(`الطلبات المتأخرة أكثر من شهر: ${overdueOrders.length}`, 14, startY + 7);
      
      const customersTableData = customerBalances.map(customer => [
        customer.customer_name,
        `${customer.outstanding_balance.toLocaleString()} ر.س`,
        String(customer.unpaid_invoices_count),
        customerPhones[customer.customer_id] || '-',
        customer.earliest_due_date ? format(new Date(customer.earliest_due_date), 'dd/MM/yyyy', { locale: ar }) : '-'
      ]);
      
      autoTable(doc, {
        startY: startY + 12,
        head: [['اسم العميل', 'المبلغ المستحق', 'عدد الطلبات', 'رقم الجوال', 'تاريخ الاستحقاق']],
        body: customersTableData,
        theme: 'striped',
        styles: { font: 'helvetica', halign: 'right', fontSize: 8 },
        headStyles: { fillColor: [52, 152, 219] }
      });
      
      doc.save(`تقرير_العملاء_المدينون_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast({ title: 'تم التصدير بنجاح', description: 'تم تصدير التقرير إلى PDF' });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({ title: 'خطأ', description: 'فشل تصدير التقرير', variant: 'destructive' });
    }
  };

  const exportToExcel = async () => {
    try {
      // جلب الطلبات المتأخرة
      const { data: ordersData } = await supabase
        .from('order_payment_summary')
        .select('*')
        .gt('balance', 0);
      
      const overdueOrders = ordersData?.filter(order => {
        const dueDate = order.created_at ? new Date(order.created_at) : null;
        if (!dueDate) return false;
        const daysOverdue = differenceInDays(new Date(), dueDate);
        return daysOverdue > 30;
      }) || [];
      
      // ورقة الملخص
      const summarySheet = XLSX.utils.aoa_to_sheet([
        ['تقرير أرصدة العملاء المدينون'],
        [`التاريخ: ${format(new Date(), 'dd/MM/yyyy', { locale: ar })}`],
        [],
        ['البيان', 'المبلغ'],
        ['إجمالي الطلبات', accountingSummary.total_invoiced],
        ['إجمالي المدفوعات', accountingSummary.total_paid],
        ['المبلغ المستحق', accountingSummary.total_outstanding],
        ['رصيد الحساب', accountingSummary.account_balance],
        [],
        ['إحصائيات'],
        ['عدد العملاء المدينون', customerBalances.length],
        ['الطلبات المتأخرة أكثر من شهر', overdueOrders.length]
      ]);
      
      // ورقة تفاصيل العملاء
      const customersData = customerBalances.map(customer => ({
        'اسم العميل': customer.customer_name,
        'المبلغ المستحق': customer.outstanding_balance,
        'عدد الطلبات': customer.unpaid_invoices_count,
        'رقم الجوال': customerPhones[customer.customer_id] || '-',
        'أقرب استحقاق': customer.earliest_due_date ? format(new Date(customer.earliest_due_date), 'dd/MM/yyyy') : '-',
        'آخر استحقاق': customer.latest_due_date ? format(new Date(customer.latest_due_date), 'dd/MM/yyyy') : '-'
      }));
      const customersSheet = XLSX.utils.json_to_sheet(customersData);
      
      // ورقة الطلبات المتأخرة
      const overdueData = overdueOrders.map(order => {
        const dueDate = order.created_at ? new Date(order.created_at) : null;
        return {
          'رقم الطلب': order.order_number,
          'اسم العميل': order.customer_name,
          'المبلغ الإجمالي': order.total_amount,
          'المبلغ المدفوع': order.paid_amount || 0,
          'المبلغ المتبقي': order.balance,
          'تاريخ الطلب': dueDate ? format(dueDate, 'dd/MM/yyyy') : '-',
          'أيام التأخير': dueDate ? differenceInDays(new Date(), dueDate) : 0
        };
      });
      const overdueSheet = XLSX.utils.json_to_sheet(overdueData);
      
      // إنشاء الملف
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'الملخص');
      XLSX.utils.book_append_sheet(workbook, customersSheet, 'تفاصيل العملاء');
      XLSX.utils.book_append_sheet(workbook, overdueSheet, 'الطلبات المتأخرة');
      
      XLSX.writeFile(workbook, `تقرير_العملاء_المدينون_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast({ title: 'تم التصدير بنجاح', description: 'تم تصدير التقرير إلى Excel' });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({ title: 'خطأ', description: 'فشل تصدير التقرير', variant: 'destructive' });
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
        <div className="flex gap-2">
          <Button onClick={exportToPDF} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            تصدير PDF
          </Button>
          <Button onClick={exportToExcel} variant="outline" size="sm">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            تصدير Excel
          </Button>
          <Button onClick={syncAccountBalance} variant="outline" size="sm">
            <TrendingDown className="h-4 w-4 mr-2" />
            مزامنة الأرصدة
          </Button>
        </div>
      </div>

      {/* ملخص الحسابات */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
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
                    {customer.earliest_due_date 
                      ? format(new Date(customer.earliest_due_date), 'dd/MM/yyyy', { locale: ar })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {customer.latest_due_date 
                      ? format(new Date(customer.latest_due_date), 'dd/MM/yyyy', { locale: ar })
                      : '-'}
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
                                          {order.created_at 
                                            ? format(new Date(order.created_at), 'dd/MM/yyyy', { locale: ar })
                                            : '-'}
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
                                          {payment.payment_date 
                                            ? format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ar })
                                            : '-'}
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