import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, CreditCard, DollarSign, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface PaymentSummary {
  payment_type: string;
  total_amount: number;
  payment_count: number;
  account_name: string;
  percentage: number;
}

interface RecentPayment {
  id: string;
  amount: number;
  payment_type: string;
  payment_date: string;
  customer_name?: string;
  invoice_number?: string;
}

const PaymentsByType = () => {
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [totalPayments, setTotalPayments] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);

      // جلب ملخص المدفوعات حسب النوع
      const { data: summaryData } = await supabase
        .from('payments')
        .select(`
          payment_type,
          amount,
          invoices!inner(
            customer_id,
            customers(name)
          )
        `);

      if (summaryData) {
        // حساب المجموع الكلي
        const total = summaryData.reduce((sum, payment) => sum + payment.amount, 0);
        setTotalPayments(total);

        // تجميع المدفوعات حسب النوع
        const grouped = summaryData.reduce((acc, payment) => {
          const type = payment.payment_type;
          if (!acc[type]) {
            acc[type] = {
              payment_type: type,
              total_amount: 0,
              payment_count: 0,
              account_name: getAccountName(type),
              percentage: 0
            };
          }
          acc[type].total_amount += payment.amount;
          acc[type].payment_count += 1;
          return acc;
        }, {} as Record<string, PaymentSummary>);

        // حساب النسب المئوية
        const summaryArray = Object.values(grouped).map(item => ({
          ...item,
          percentage: total > 0 ? (item.total_amount / total) * 100 : 0
        }));

        setPaymentSummary(summaryArray);
      }

      // جلب آخر المدفوعات
      const { data: recentData } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_type,
          payment_date,
          invoices(
            invoice_number,
            customers(name)
          )
        `)
        .order('payment_date', { ascending: false })
        .limit(10);

      if (recentData) {
        const formattedRecent = recentData.map(payment => ({
          id: payment.id,
          amount: payment.amount,
          payment_type: payment.payment_type,
          payment_date: payment.payment_date,
          customer_name: payment.invoices?.customers?.name,
          invoice_number: payment.invoices?.invoice_number
        }));
        setRecentPayments(formattedRecent);
      }

    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAccountName = (paymentType: string) => {
    switch (paymentType) {
      case 'نقدي':
        return 'النقدية';
      case 'تحويل بنكي':
        return 'البنك';
      case 'الشبكة':
        return 'الشبكة';
      default:
        return 'حساب عام';
    }
  };

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case 'نقدي':
        return 'bg-green-100 text-green-800';
      case 'تحويل بنكي':
        return 'bg-blue-100 text-blue-800';
      case 'الشبكة':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentTypeIcon = (type: string) => {
    switch (type) {
      case 'نقدي':
        return <DollarSign className="h-4 w-4" />;
      case 'تحويل بنكي':
        return <CreditCard className="h-4 w-4" />;
      case 'الشبكة':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">المدفوعات حسب النوع</h1>
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
        <h1 className="text-3xl font-bold text-foreground">المدفوعات حسب النوع</h1>
        <Badge variant="outline" className="text-lg px-4 py-2">
          إجمالي المدفوعات: {totalPayments.toLocaleString()} ر.س
        </Badge>
      </div>

      {/* ملخص المدفوعات حسب النوع */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {paymentSummary.map((summary) => (
          <Card key={summary.payment_type} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {summary.payment_type}
              </CardTitle>
              <div className="flex items-center gap-2">
                {getPaymentTypeIcon(summary.payment_type)}
                <Badge variant="secondary" className="text-xs">
                  {summary.percentage.toFixed(1)}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-primary">
                  {summary.total_amount.toLocaleString()} ر.س
                </div>
                <div className="text-sm text-muted-foreground">
                  عدد المدفوعات: {summary.payment_count}
                </div>
                <div className="text-sm text-muted-foreground">
                  الحساب المحاسبي: {summary.account_name}
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${summary.percentage}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* آخر المدفوعات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            آخر المدفوعات
          </CardTitle>
          <CardDescription>
            آخر 10 مدفوعات تم استلامها
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>نوع الدفع</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ar })}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={getPaymentTypeColor(payment.payment_type)}
                      variant="secondary"
                    >
                      {payment.payment_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{payment.customer_name || 'غير محدد'}</TableCell>
                  <TableCell>{payment.invoice_number || '-'}</TableCell>
                  <TableCell className="text-right font-medium">
                    {payment.amount.toLocaleString()} ر.س
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* تفاصيل الحسابات المحاسبية */}
      <Card>
        <CardHeader>
          <CardTitle>ربط أنواع الدفع بالحسابات المحاسبية</CardTitle>
          <CardDescription>
            يوضح هذا الجدول كيفية ربط كل نوع دفع بالحساب المحاسبي المناسب
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نوع الدفع</TableHead>
                <TableHead>الحساب المحاسبي</TableHead>
                <TableHead>نوع الحساب</TableHead>
                <TableHead>الوصف</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Badge className="bg-green-100 text-green-800">نقدي</Badge>
                </TableCell>
                <TableCell>النقدية</TableCell>
                <TableCell>أصول</TableCell>
                <TableCell>النقدية في الصندوق</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Badge className="bg-blue-100 text-blue-800">تحويل بنكي</Badge>
                </TableCell>
                <TableCell>البنك</TableCell>
                <TableCell>أصول</TableCell>
                <TableCell>الحسابات البنكية</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Badge className="bg-purple-100 text-purple-800">الشبكة</Badge>
                </TableCell>
                <TableCell>الشبكة</TableCell>
                <TableCell>أصول</TableCell>
                <TableCell>مدفوعات البطاقات الائتمانية</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsByType;