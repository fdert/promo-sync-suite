import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, CreditCard, DollarSign, TrendingUp, Download, FileSpreadsheet, FileText, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

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
  order_number?: string;
}

const PaymentsByType = () => {
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<RecentPayment[]>([]);
  const [totalPayments, setTotalPayments] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // فلاتر زمنية
  const [dateFilter, setDateFilter] = useState({
    period: 'all', // all, today, this_month, this_year, custom
    startDate: '',
    endDate: ''
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [dateFilter, recentPayments]);

  // دالة تطبيق الفلاتر
  const applyFilters = () => {
    let filtered = [...recentPayments];
    const now = new Date();

    if (dateFilter.period === 'today') {
      const today = now.toISOString().split('T')[0];
      filtered = filtered.filter(payment => 
        payment.payment_date.startsWith(today)
      );
    } else if (dateFilter.period === 'this_month') {
      const thisMonth = format(now, 'yyyy-MM');
      filtered = filtered.filter(payment => 
        payment.payment_date.startsWith(thisMonth)
      );
    } else if (dateFilter.period === 'this_year') {
      const thisYear = format(now, 'yyyy');
      filtered = filtered.filter(payment => 
        payment.payment_date.startsWith(thisYear)
      );
    } else if (dateFilter.period === 'custom' && dateFilter.startDate && dateFilter.endDate) {
      filtered = filtered.filter(payment => {
        const paymentDate = new Date(payment.payment_date);
        const start = new Date(dateFilter.startDate);
        const end = new Date(dateFilter.endDate + 'T23:59:59');
        return paymentDate >= start && paymentDate <= end;
      });
    }

    setFilteredPayments(filtered);
  };

  const fetchPaymentData = async () => {
    try {
      setLoading(true);

      // جلب جميع المدفوعات من الطلبات مع بيانات العملاء
      const { data: allPaymentsData } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_type,
          payment_date,
          order_id,
          orders(
            order_number,
            customers(name)
          )
        `)
        .order('payment_date', { ascending: false });

      if (allPaymentsData) {
        // حساب المجموع الكلي
        const total = allPaymentsData.reduce((sum, payment) => sum + payment.amount, 0);
        setTotalPayments(total);

        // تجميع المدفوعات حسب النوع
        const grouped = allPaymentsData.reduce((acc, payment) => {
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

        // تحضير بيانات المدفوعات الأخيرة من الطلبات
        const formattedRecent = allPaymentsData.map(payment => ({
          id: payment.id,
          amount: payment.amount,
          payment_type: payment.payment_type,
          payment_date: payment.payment_date,
          customer_name: payment.orders?.customers?.name || 'غير محدد',
          order_number: payment.orders?.order_number || 'غير محدد'
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

  // حساب إحصائيات المدفوعات المفلترة
  const getFilteredStats = () => {
    const totalFiltered = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    const groupedFiltered = filteredPayments.reduce((acc, payment) => {
      const type = payment.payment_type;
      if (!acc[type]) {
        acc[type] = { total: 0, count: 0 };
      }
      acc[type].total += payment.amount;
      acc[type].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    return { totalFiltered, groupedFiltered };
  };

  // تصدير إلى Excel
  const exportToExcel = () => {
    const { totalFiltered, groupedFiltered } = getFilteredStats();
    
    // إنشاء محتوى CSV
    let csvContent = "نوع الدفع,المبلغ الإجمالي,عدد المدفوعات,النسبة المئوية\n";
    
    Object.entries(groupedFiltered).forEach(([type, data]) => {
      const percentage = totalFiltered > 0 ? ((data.total / totalFiltered) * 100).toFixed(2) : '0.00';
      csvContent += `${type},${data.total},${data.count},${percentage}%\n`;
    });
    
    csvContent += `\nإجمالي المدفوعات,${totalFiltered},${filteredPayments.length},100%\n`;
    
    // تحميل الملف
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `تقرير_المدفوعات_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "تم التصدير",
      description: "تم تصدير التقرير بصيغة Excel بنجاح",
    });
  };

  // تصدير إلى PDF (محاكاة)
  const exportToPDF = () => {
    const { totalFiltered, groupedFiltered } = getFilteredStats();
    
    // إنشاء نافذة طباعة بتنسيق جميل
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>تقرير المدفوعات حسب النوع</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; }
              .header { text-align: center; margin-bottom: 30px; }
              .company-name { font-size: 24px; font-weight: bold; color: #1f2937; }
              .report-title { font-size: 18px; color: #6b7280; margin-top: 10px; }
              .date-info { font-size: 14px; color: #9ca3af; margin-top: 5px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: center; }
              th { background-color: #f3f4f6; font-weight: bold; }
              .total-row { background-color: #fef3c7; font-weight: bold; }
              .summary { background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company-name">وكالة الإبداع للدعاية والإعلان</div>
              <div class="report-title">تقرير المدفوعات حسب النوع</div>
              <div class="date-info">
                تاريخ التقرير: ${format(new Date(), 'dd/MM/yyyy')} - 
                الفترة: ${dateFilter.period === 'today' ? 'اليوم' : 
                         dateFilter.period === 'this_month' ? 'هذا الشهر' :
                         dateFilter.period === 'this_year' ? 'هذا العام' :
                         dateFilter.period === 'custom' ? `من ${dateFilter.startDate} إلى ${dateFilter.endDate}` :
                         'جميع الفترات'}
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>نوع الدفع</th>
                  <th>المبلغ الإجمالي (ر.س)</th>
                  <th>عدد المدفوعات</th>
                  <th>النسبة المئوية</th>
                  <th>الحساب المحاسبي</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(groupedFiltered).map(([type, data]) => {
                  const percentage = totalFiltered > 0 ? ((data.total / totalFiltered) * 100).toFixed(2) : '0.00';
                  return `
                    <tr>
                      <td>${type}</td>
                      <td>${data.total.toLocaleString()}</td>
                      <td>${data.count}</td>
                      <td>${percentage}%</td>
                      <td>${getAccountName(type)}</td>
                    </tr>
                  `;
                }).join('')}
                <tr class="total-row">
                  <td><strong>الإجمالي</strong></td>
                  <td><strong>${totalFiltered.toLocaleString()}</strong></td>
                  <td><strong>${filteredPayments.length}</strong></td>
                  <td><strong>100%</strong></td>
                  <td>-</td>
                </tr>
              </tbody>
            </table>
            
            <div class="summary">
              <h3>ملخص التقرير:</h3>
              <p>• إجمالي المدفوعات في الفترة المحددة: <strong>${totalFiltered.toLocaleString()} ر.س</strong></p>
              <p>• عدد المعاملات: <strong>${filteredPayments.length} معاملة</strong></p>
              <p>• أعلى نوع دفع: <strong>${Object.entries(groupedFiltered).sort((a, b) => b[1].total - a[1].total)[0]?.[0] || 'لا يوجد'}</strong></p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
    
    toast({
      title: "تم التصدير",
      description: "تم فتح نافذة الطباعة لحفظ التقرير كـ PDF",
    });
  };

  // تصدير آخر المدفوعات إلى Excel
  const exportRecentPaymentsToExcel = () => {
    const paymentsToExport = dateFilter.period === 'all' ? recentPayments : filteredPayments;
    
    // إنشاء محتوى CSV
    let csvContent = "التاريخ,نوع الدفع,العميل,رقم الطلب,المبلغ (ر.س)\n";
    
    paymentsToExport.forEach((payment) => {
      const date = format(new Date(payment.payment_date), 'dd/MM/yyyy');
      csvContent += `${date},${payment.payment_type},${payment.customer_name || 'غير محدد'},${payment.order_number || '-'},${payment.amount}\n`;
    });
    
    const totalAmount = paymentsToExport.reduce((sum, p) => sum + p.amount, 0);
    csvContent += `\nالإجمالي,,,${totalAmount}\n`;
    
    // تحميل الملف
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `آخر_المدفوعات_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "تم التصدير",
      description: "تم تصدير آخر المدفوعات بصيغة Excel بنجاح",
    });
  };

  // تصدير آخر المدفوعات إلى PDF
  const exportRecentPaymentsToPDF = () => {
    const paymentsToExport = dateFilter.period === 'all' ? recentPayments : filteredPayments;
    const totalAmount = paymentsToExport.reduce((sum, p) => sum + p.amount, 0);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>تقرير آخر المدفوعات</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; }
              .header { text-align: center; margin-bottom: 30px; }
              .company-name { font-size: 24px; font-weight: bold; color: #1f2937; }
              .report-title { font-size: 18px; color: #6b7280; margin-top: 10px; }
              .date-info { font-size: 14px; color: #9ca3af; margin-top: 5px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: center; }
              th { background-color: #f3f4f6; font-weight: bold; }
              .total-row { background-color: #fef3c7; font-weight: bold; }
              .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
              .badge-cash { background-color: #dcfce7; color: #166534; }
              .badge-bank { background-color: #dbeafe; color: #1e40af; }
              .badge-network { background-color: #f3e8ff; color: #6b21a8; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company-name">وكالة الإبداع للدعاية والإعلان</div>
              <div class="report-title">تقرير آخر المدفوعات</div>
              <div class="date-info">
                تاريخ التقرير: ${format(new Date(), 'dd/MM/yyyy')} - 
                ${dateFilter.period === 'all' ? 'جميع المدفوعات' : 
                  dateFilter.period === 'today' ? 'مدفوعات اليوم' :
                  dateFilter.period === 'this_month' ? 'مدفوعات هذا الشهر' :
                  dateFilter.period === 'this_year' ? 'مدفوعات هذا العام' :
                  `من ${dateFilter.startDate} إلى ${dateFilter.endDate}`}
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>نوع الدفع</th>
                  <th>العميل</th>
                  <th>رقم الطلب</th>
                  <th>المبلغ (ر.س)</th>
                </tr>
              </thead>
              <tbody>
                ${paymentsToExport.map((payment) => {
                  const badgeClass = payment.payment_type === 'نقدي' ? 'badge-cash' :
                                   payment.payment_type === 'تحويل بنكي' ? 'badge-bank' : 'badge-network';
                  return `
                    <tr>
                      <td>${format(new Date(payment.payment_date), 'dd/MM/yyyy')}</td>
                      <td><span class="badge ${badgeClass}">${payment.payment_type}</span></td>
                      <td>${payment.customer_name || 'غير محدد'}</td>
                      <td>${payment.order_number || '-'}</td>
                      <td>${payment.amount.toLocaleString()}</td>
                    </tr>
                  `;
                }).join('')}
                <tr class="total-row">
                  <td colspan="4"><strong>الإجمالي</strong></td>
                  <td><strong>${totalAmount.toLocaleString()}</strong></td>
                </tr>
              </tbody>
            </table>
            
            <div style="margin-top: 20px; text-align: center; color: #6b7280;">
              عدد المعاملات: ${paymentsToExport.length} معاملة | إجمالي المبلغ: ${totalAmount.toLocaleString()} ر.س
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
    
    toast({
      title: "تم التصدير",
      description: "تم فتح نافذة الطباعة لحفظ تقرير آخر المدفوعات كـ PDF",
    });
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
        <div className="flex items-center gap-4">
          <Button onClick={exportToExcel} variant="outline" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            تصدير Excel
          </Button>
          <Button onClick={exportToPDF} variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            تصدير PDF
          </Button>
          <Badge variant="outline" className="text-lg px-4 py-2">
            إجمالي المدفوعات: {totalPayments.toLocaleString()} ر.س
          </Badge>
        </div>
      </div>

      {/* فلاتر زمنية */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            فلاتر التقارير
          </CardTitle>
          <CardDescription>اختر الفترة الزمنية لعرض تقرير مفصل</CardDescription>
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
                  <SelectItem value="all">جميع الفترات</SelectItem>
                  <SelectItem value="today">اليوم</SelectItem>
                  <SelectItem value="this_month">هذا الشهر</SelectItem>
                  <SelectItem value="this_year">هذا العام</SelectItem>
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
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={applyFilters}
                className="gap-2 mt-1"
              >
                <Search className="h-4 w-4" />
                تطبيق الفلتر
              </Button>
            </div>
          </div>

          {/* إحصائيات الفترة المفلترة */}
          {filteredPayments.length !== recentPayments.length && (
            <div className="grid gap-4 md:grid-cols-3 mt-6">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-primary">
                    {getFilteredStats().totalFiltered.toLocaleString()} ر.س
                  </div>
                  <p className="text-sm text-muted-foreground">إجمالي المدفوعات المفلترة</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-success">
                    {filteredPayments.length}
                  </div>
                  <p className="text-sm text-muted-foreground">عدد المعاملات</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-info">
                    {Object.keys(getFilteredStats().groupedFiltered).length}
                  </div>
                  <p className="text-sm text-muted-foreground">أنواع الدفع المستخدمة</p>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* آخر المدفوعات أو المدفوعات المفلترة */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {dateFilter.period === 'all' ? 'آخر المدفوعات' : 'المدفوعات المفلترة'}
              </CardTitle>
              <CardDescription>
                {dateFilter.period === 'all' 
                  ? `آخر ${recentPayments.slice(0, 20).length} مدفوعة تم استلامها`
                  : `${filteredPayments.length} مدفوعة في الفترة المحددة`
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={exportRecentPaymentsToExcel} variant="outline" size="sm" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              <Button onClick={exportRecentPaymentsToPDF} variant="outline" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
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
              {(dateFilter.period === 'all' ? recentPayments.slice(0, 20) : filteredPayments).map((payment) => (
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
                  <TableCell>{payment.order_number || '-'}</TableCell>
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