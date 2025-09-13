import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, AlertTriangle, Users, DollarSign, FileText, TrendingDown, ClipboardList, Eye, Search, Filter, MessageSquare, Printer, Download, FileSpreadsheet, Plus, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

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
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  
  // Summary dialog states
  const [summaryText, setSummaryText] = useState('');
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [selectedCustomerData, setSelectedCustomerData] = useState<CustomerBalance | null>(null);

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

  // Filter functions
  const getDateRange = (filter: string) => {
    const now = new Date();
    switch (filter) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'this_year':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'last_year':
        const lastYear = subYears(now, 1);
        return { start: startOfYear(lastYear), end: endOfYear(lastYear) };
      case 'custom':
        return customDateFrom && customDateTo 
          ? { start: startOfDay(customDateFrom), end: endOfDay(customDateTo) }
          : null;
      default:
        return null;
    }
  };

  const filteredData = () => {
    let filtered = [...customerBalances];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Date filter
    const dateRange = getDateRange(dateFilter);
    if (dateRange) {
      filtered = filtered.filter(customer => {
        const earliestDate = new Date(customer.earliest_due_date);
        return earliestDate >= dateRange.start && earliestDate <= dateRange.end;
      });
    }
    
    return filtered;
  };

  const filteredOrders = () => {
    let filtered = [...unpaidOrders];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Date filter
    const dateRange = getDateRange(dateFilter);
    if (dateRange) {
      filtered = filtered.filter(order => {
        const dueDate = new Date(order.due_date);
        return dueDate >= dateRange.start && dueDate <= dateRange.end;
      });
    }
    
    return filtered;
  };

  // Generate summary
  const generateSummary = (customer: CustomerBalance) => {
    const orders = customerOrders[customer.customer_id] || [];
    const payments = customerPayments[customer.customer_id] || [];
    
    const summary = `
 تقرير مالي للعميل: ${customer.customer_name}
 
 جملة المبالغ المستحقة: ${customer.outstanding_balance.toLocaleString()} ر.س
 عدد الطلبات غير المدفوعة: ${customer.unpaid_invoices_count}
 أقرب تاريخ استحقاق: ${format(new Date(customer.earliest_due_date), 'dd/MM/yyyy', { locale: ar })}
 آخر تاريخ استحقاق: ${format(new Date(customer.latest_due_date), 'dd/MM/yyyy', { locale: ar })}
 
آخر ${Math.min(5, orders.length)} طلبات:
${orders.slice(0, 5).map(order => 
  `- طلب رقم: ${order.order_number} | الخدمة: ${order.service_name} | المبلغ: ${order.amount.toLocaleString()} ر.س | الحالة: ${order.status}`
).join('\n')}

آخر ${Math.min(5, payments.length)} مدفوعات:
${payments.slice(0, 5).map(payment => 
  `- مبلغ: ${payment.amount.toLocaleString()} ر.س | نوع الدفع: ${payment.payment_type} | التاريخ: ${format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ar })}`
).join('\n')}

تاريخ التقرير: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}
`;
    
    return summary;
  };

  // Handle summary actions
  const handleSendWhatsApp = async () => {
    if (!selectedCustomerData) return;
    
    try {
      // Get customer WhatsApp number and name
      const { data: customer } = await supabase
        .from('customers')
        .select('whatsapp_number, phone, name')
        .eq('id', selectedCustomerData.customer_id)
        .single();
      
      if (!customer?.whatsapp_number && !customer?.phone) {
        toast({
          title: "خطأ",
          description: "لا يوجد رقم واتساب للعميل",
          variant: "destructive"
        });
        return;
      }
      
      const phone = customer.whatsapp_number || customer.phone;

      // إرسال مباشر عبر Edge Function الموثوقة مع اختيار أفضل Webhook
      const { data: functionData, error: functionError } = await supabase.functions.invoke('send-whatsapp-simple', {
        body: {
          phone,
          message: summaryText
        }
      });
      
      if (functionError || functionData?.status !== 'sent') {
        console.error('خطأ/فشل في الإرسال عبر الويب هوك:', functionError || functionData);
        // فتح واتساب كحل بديل لإتمام الإرسال يدويًا
        const waNumber = String(phone).replace(/[^\d]/g, '').replace(/^0+/, '');
        window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(summaryText)}`, '_blank');
        toast({
          title: 'تم فتح واتساب كحل بديل',
          description: 'تعذر الإرسال الآلي، تم فتح واتساب لإرسال الرسالة يدويًا.',
        });
        return;
      }

      toast({
        title: "تم الإرسال",
        description: "تم إرسال رسالة ملخص الحساب بنجاح",
      });
      
      setShowSummaryDialog(false);
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      
      toast({
        title: "خطأ",
        description: "فشل في إرسال الرسالة",
        variant: "destructive"
      });
    }
  };

  // Handle direct WhatsApp send for each customer
  const handleDirectWhatsApp = async (customer: CustomerBalance) => {
    try {
      console.log('🚀 إرسال رسالة واتساب مباشرة...');
      
      // Get customer WhatsApp number
      const { data: customerData } = await supabase
        .from('customers')
        .select('whatsapp_number, phone, name')
        .eq('id', customer.customer_id)
        .single();
      
      if (!customerData?.whatsapp_number && !customerData?.phone) {
        toast({
          title: "خطأ",
          description: "لا يوجد رقم واتساب للعميل",
          variant: "destructive"
        });
        return;
      }
      
      const phoneNumber = customerData.whatsapp_number || customerData.phone;
      
      // إعداد التقرير المالي
      const summary = generateSummary(customer);
      
      console.log('📊 التقرير المالي جاهز للإرسال');
      console.log('📱 الرقم المستهدف:', phoneNumber);
      
      // استدعاء edge function الجديد المبسط
      const { data: functionData, error: functionError } = await supabase.functions.invoke('send-whatsapp-simple', {
        body: {
          phone: phoneNumber,
          message: summary
        }
      });
      
      if (functionError || functionData?.status !== 'sent') {
        console.error('خطأ في استدعاء/فشل edge function:', functionError || functionData);
        // فتح واتساب كحل بديل لإتمام الإرسال يدويًا
        const waNumber = String(phoneNumber).replace(/[^\d]/g, '').replace(/^0+/, '');
        window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(summary)}`, '_blank');
        toast({
          title: 'تم فتح واتساب كحل بديل',
          description: 'تعذر الإرسال الآلي، تم فتح واتساب لإرسال الرسالة يدويًا.',
        });
        return;
      }
      
      // نجاح

    } catch (error) {
      console.error('❌ خطأ في الإرسال:', error);
      
      toast({
        title: "خطأ في الإرسال",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive"
      });
    }
  };

  // Handle processing pending messages
  const handleProcessPendingMessages = async () => {
    try {
      console.log('🔄 تشغيل معالج الرسائل المعلقة...');
      
      const { data, error } = await supabase.functions.invoke('send-pending-whatsapp');
      
      if (error) {
        console.error('❌ خطأ في معالج الرسائل المعلقة:', error);
        toast({
          title: "خطأ",
          description: "فشل في تشغيل معالج الرسائل المعلقة",
          variant: "destructive"
        });
        return;
      }

      console.log('📊 نتائج معالجة الرسائل:', data);
      
      if (data?.success) {
        toast({
          title: "تم بنجاح",
          description: `تم معالجة ${data.processed} رسالة. نجح: ${data.successful}, فشل: ${data.failed}`,
        });
      } else {
        toast({
          title: "تحذير",
          description: data?.message || "لا توجد رسائل معلقة للمعالجة",
        });
      }
    } catch (error) {
      console.error('❌ خطأ في تشغيل معالج الرسائل:', error);
      toast({
        title: "خطأ",
        description: "فشل في تشغيل معالج الرسائل",
        variant: "destructive"
      });
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>ملخص العميل - ${selectedCustomerData?.customer_name}</title>
            <style>
              body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .content { white-space: pre-line; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>ملخص العميل</h1>
              <h2>${selectedCustomerData?.customer_name}</h2>
            </div>
            <div class="content">${summaryText}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownloadPDF = () => {
    toast({
      title: "قريباً",
      description: "خاصية تحميل PDF ستكون متاحة قريباً"
    });
  };

  const handleDownloadExcel = () => {
    if (!selectedCustomerData) return;
    
    const orders = customerOrders[selectedCustomerData.customer_id] || [];
    const payments = customerPayments[selectedCustomerData.customer_id] || [];
    
    const data = [
      ['ملخص العميل', selectedCustomerData.customer_name],
      ['المبلغ المستحق', selectedCustomerData.outstanding_balance],
      ['عدد الطلبات غير المدفوعة', selectedCustomerData.unpaid_invoices_count],
      ['أقرب استحقاق', format(new Date(selectedCustomerData.earliest_due_date), 'dd/MM/yyyy')],
      ['آخر استحقاق', format(new Date(selectedCustomerData.latest_due_date), 'dd/MM/yyyy')],
      [''],
      ['الطلبات'],
      ['رقم الطلب', 'الخدمة', 'المبلغ', 'الحالة', 'تاريخ الإنشاء'],
      ...orders.map(order => [
        order.order_number,
        order.service_name,
        order.amount,
        order.status,
        format(new Date(order.created_at), 'dd/MM/yyyy')
      ]),
      [''],
      ['المدفوعات'],
      ['المبلغ', 'نوع الدفع', 'تاريخ الدفع'],
      ...payments.map(payment => [
        payment.amount,
        payment.payment_type,
        format(new Date(payment.payment_date), 'dd/MM/yyyy')
      ])
    ];
    
    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `customer_summary_${selectedCustomerData.customer_name}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const openSummaryDialog = (customer: CustomerBalance) => {
    setSelectedCustomerData(customer);
    setSummaryText(generateSummary(customer));
    setShowSummaryDialog(true);
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
        <Button 
          onClick={handleProcessPendingMessages}
          variant="outline"
          className="flex items-center gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          إرسال الرسائل المعلقة
        </Button>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            البحث والفلترة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="search">البحث</Label>
              <Input
                id="search"
                placeholder="اسم العميل، رقم الجوال، رقم الطلب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Date Filter */}
            <div className="space-y-2">
              <Label htmlFor="dateFilter">فلترة حسب التاريخ</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفترة الزمنية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفترات</SelectItem>
                  <SelectItem value="today">اليوم</SelectItem>
                  <SelectItem value="this_month">هذا الشهر</SelectItem>
                  <SelectItem value="last_month">الشهر الماضي</SelectItem>
                  <SelectItem value="this_year">هذا العام</SelectItem>
                  <SelectItem value="last_year">العام الماضي</SelectItem>
                  <SelectItem value="custom">فترة مخصصة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date From */}
            {dateFilter === 'custom' && (
              <div className="space-y-2">
                <Label>من تاريخ</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateFrom ? format(customDateFrom, 'dd/MM/yyyy') : 'اختر التاريخ'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customDateFrom}
                      onSelect={setCustomDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Custom Date To */}
            {dateFilter === 'custom' && (
              <div className="space-y-2">
                <Label>إلى تاريخ</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateTo ? format(customDateTo, 'dd/MM/yyyy') : 'اختر التاريخ'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customDateTo}
                      onSelect={setCustomDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ملخص سريع */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عدد العملاء المدينون</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {filteredData().length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              من أصل {customerBalances.length} عميل
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلبات غير المدفوعة</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {filteredOrders().length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              من أصل {unpaidOrders.length} طلب
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المتأخرة أكثر من 30 يوم</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {filteredOrders().filter(order => order.days_overdue > 30).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              طلبات متأخرة جداً
            </p>
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
              {filteredData().map((customer) => (
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
                     <div className="flex gap-2 flex-wrap">
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
                       
                       <Button 
                         variant="outline" 
                         size="sm"
                         onClick={() => openSummaryDialog(customer)}
                       >
                         <FileText className="h-4 w-4 mr-2" />
                         ملخص
                       </Button>

                       <Button 
                         variant="default" 
                         size="sm"
                         onClick={() => handleDirectWhatsApp(customer)}
                         className="bg-green-600 hover:bg-green-700 text-white"
                       >
                         <MessageSquare className="h-4 w-4 mr-2" />
                         واتساب
                       </Button>
                     </div>
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
              {filteredOrders().map((order) => {
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

      {/* Summary Dialog */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              ملخص العميل: {selectedCustomerData?.customer_name}
            </DialogTitle>
            <DialogDescription>
              يمكنك تعديل الملخص وإرساله أو طباعته أو تحميله
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Summary Content */}
            <div className="space-y-2">
              <Label htmlFor="summaryText">محتوى الملخص</Label>
              <Textarea
                id="summaryText"
                value={summaryText}
                onChange={(e) => setSummaryText(e.target.value)}
                rows={15}
                className="resize-none"
                placeholder="محتوى الملخص..."
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <Button 
                onClick={handleSendWhatsApp}
                className="flex items-center gap-2"
                variant="default"
              >
                <MessageSquare className="h-4 w-4" />
                إرسال واتساب
              </Button>
              
              <Button 
                onClick={handlePrint}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
              
              <Button 
                onClick={handleDownloadPDF}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                تحميل PDF
              </Button>
              
              <Button 
                onClick={handleDownloadExcel}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                تحميل Excel
              </Button>
              
              <Button 
                onClick={() => setShowSummaryDialog(false)}
                variant="secondary"
                className="mr-auto"
              >
                إغلاق
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsOverview;