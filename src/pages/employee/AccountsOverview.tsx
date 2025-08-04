import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, AlertTriangle, Clock, TrendingUp, TrendingDown, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// توحيد أنواع المدفوعات
const PAYMENT_TYPES = {
  CASH: 'نقدي',
  BANK: 'تحويل بنكي', 
  NETWORK: 'الشبكة'
} as const;

const AccountsOverview = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // فلاتر البحث للفواتير غير المدفوعة
  const [searchFilters, setSearchFilters] = useState({
    customerName: '',
    dateFrom: '',
    dateTo: '',
    status: 'all'
  });

  const { toast } = useToast();

  // جلب الحسابات
  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .order('account_type', { ascending: true });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  // جلب الفواتير غير المدفوعة
  const fetchUnpaidInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers(name, phone, whatsapp_number)
        `)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // فلترة الفواتير غير المدفوعة بالكامل
      const unpaid = (data || []).filter(invoice => {
        const remainingAmount = invoice.total_amount - (invoice.paid_amount || 0);
        return remainingAmount > 0.01;
      }).map(invoice => {
        const today = new Date();
        const dueDate = new Date(invoice.due_date);
        const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          ...invoice,
          remaining_amount: invoice.total_amount - (invoice.paid_amount || 0),
          days_overdue: daysDiff > 0 ? daysDiff : 0,
          is_overdue: daysDiff > 0,
          payment_status: invoice.paid_amount > 0 ? 'partial' : 'unpaid'
        };
      });

      setUnpaidInvoices(unpaid);
    } catch (error) {
      console.error('Error fetching unpaid invoices:', error);
    }
  };

  // جلب المدفوعات الأخيرة
  const fetchRecentPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          invoices(invoice_number),
          orders(order_number)
        `)
        .order('payment_date', { ascending: false })
        .limit(15);

      if (error) throw error;
      setRecentPayments(data || []);
    } catch (error) {
      console.error('Error fetching recent payments:', error);
    }
  };

  // تحميل جميع البيانات
  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchAccounts(),
      fetchUnpaidInvoices(),
      fetchRecentPayments()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // فلترة الفواتير غير المدفوعة
  const filteredUnpaidInvoices = unpaidInvoices.filter(invoice => {
    if (searchFilters.customerName && !invoice.customers?.name?.toLowerCase().includes(searchFilters.customerName.toLowerCase())) {
      return false;
    }
    
    if (searchFilters.dateFrom && new Date(invoice.issue_date) < new Date(searchFilters.dateFrom)) {
      return false;
    }
    
    if (searchFilters.dateTo && new Date(invoice.issue_date) > new Date(searchFilters.dateTo)) {
      return false;
    }
    
    if (searchFilters.status !== 'all') {
      if (searchFilters.status === 'overdue' && !invoice.is_overdue) return false;
      if (searchFilters.status === 'partial' && invoice.payment_status !== 'partial') return false;
      if (searchFilters.status === 'unpaid' && invoice.payment_status !== 'unpaid') return false;
    }
    
    return true;
  });

  // حساب الإحصائيات
  const calculateStats = () => {
    const totalUnpaid = filteredUnpaidInvoices.reduce((sum, inv) => sum + inv.remaining_amount, 0);
    const overdueCount = filteredUnpaidInvoices.filter(inv => inv.is_overdue).length;
    const partiallyPaidCount = filteredUnpaidInvoices.filter(inv => inv.payment_status === 'partial').length;
    
    const accountsByType = accounts.reduce((acc, account) => {
      acc[account.account_type] = (acc[account.account_type] || 0) + (Number(account.balance) || 0);
      return acc;
    }, {} as Record<string, number>);

    return {
      totalUnpaid,
      overdueCount,
      partiallyPaidCount,
      totalInvoices: filteredUnpaidInvoices.length,
      accountsByType
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل بيانات الحسابات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">نظرة عامة على الحسابات</h1>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المستحقات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.totalUnpaid.toLocaleString()} ر.س
            </div>
            <p className="text-xs text-muted-foreground">
              من {stats.totalInvoices} فاتورة غير مدفوعة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">فواتير متأخرة</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdueCount}</div>
            <p className="text-xs text-muted-foreground">
              تحتاج متابعة عاجلة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مدفوعة جزئياً</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.partiallyPaidCount}</div>
            <p className="text-xs text-muted-foreground">
              تحتاج استكمال دفع
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الأصول</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(stats.accountsByType['أصول'] || 0).toLocaleString()} ر.س
            </div>
            <p className="text-xs text-muted-foreground">
              الأصول السائلة
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="unpaid">الفواتير غير المدفوعة</TabsTrigger>
          <TabsTrigger value="payments">المدفوعات الأخيرة</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* أرصدة الحسابات */}
            <Card>
              <CardHeader>
                <CardTitle>أرصدة الحسابات حسب النوع</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.accountsByType).map(([type, balance]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="font-medium">{type}</span>
                      <span className={`font-bold ${
                        Number(balance) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {balance.toLocaleString()} ر.س
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ربط المدفوعات بالحسابات */}
            <Card>
              <CardHeader>
                <CardTitle>ربط المدفوعات بالحسابات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                    <span>نقدي → النقدية</span>
                    <Badge variant="secondary">متصل</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                    <span>تحويل بنكي → البنك</span>
                    <Badge variant="secondary">متصل</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                    <span>الشبكة → الشبكة</span>
                    <Badge variant="secondary">متصل</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="unpaid" className="space-y-4">
          {/* فلاتر البحث */}
          <Card>
            <CardHeader>
              <CardTitle>فلاتر البحث</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>اسم العميل</Label>
                  <Input
                    placeholder="ابحث بالاسم"
                    value={searchFilters.customerName}
                    onChange={(e) => setSearchFilters({...searchFilters, customerName: e.target.value})}
                  />
                </div>
                <div>
                  <Label>من تاريخ</Label>
                  <Input
                    type="date"
                    value={searchFilters.dateFrom}
                    onChange={(e) => setSearchFilters({...searchFilters, dateFrom: e.target.value})}
                  />
                </div>
                <div>
                  <Label>إلى تاريخ</Label>
                  <Input
                    type="date"
                    value={searchFilters.dateTo}
                    onChange={(e) => setSearchFilters({...searchFilters, dateTo: e.target.value})}
                  />
                </div>
                <div>
                  <Label>الحالة</Label>
                  <Select value={searchFilters.status} onValueChange={(value) => setSearchFilters({...searchFilters, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الفواتير</SelectItem>
                      <SelectItem value="unpaid">غير مدفوعة</SelectItem>
                      <SelectItem value="partial">مدفوعة جزئياً</SelectItem>
                      <SelectItem value="overdue">متأخرة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* جدول الفواتير غير المدفوعة */}
          <Card>
            <CardHeader>
              <CardTitle>الفواتير غير المدفوعة ({filteredUnpaidInvoices.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الفاتورة</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>المبلغ الكلي</TableHead>
                    <TableHead>المدفوع</TableHead>
                    <TableHead>المتبقي</TableHead>
                    <TableHead>تاريخ الاستحقاق</TableHead>
                    <TableHead>أيام التأخير</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnpaidInvoices.slice(0, 20).map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.customers?.name || 'غير محدد'}</TableCell>
                      <TableCell>{invoice.total_amount.toLocaleString()} ر.س</TableCell>
                      <TableCell>{(invoice.paid_amount || 0).toLocaleString()} ر.س</TableCell>
                      <TableCell className="font-bold text-red-600">
                        {invoice.remaining_amount.toLocaleString()} ر.س
                      </TableCell>
                      <TableCell>{new Date(invoice.due_date).toLocaleDateString('ar')}</TableCell>
                      <TableCell>
                        {invoice.is_overdue ? (
                          <Badge variant="destructive">{invoice.days_overdue} يوم</Badge>
                        ) : (
                          <Badge variant="secondary">في الموعد</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {invoice.payment_status === 'partial' ? (
                          <Badge variant="secondary">مدفوع جزئياً</Badge>
                        ) : invoice.is_overdue ? (
                          <Badge variant="destructive">متأخر</Badge>
                        ) : (
                          <Badge variant="outline">غير مدفوع</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>المدفوعات الأخيرة ({recentPayments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>نوع الدفع</TableHead>
                    <TableHead>رقم الفاتورة/الطلب</TableHead>
                    <TableHead>الحساب المرتبط</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{new Date(payment.payment_date).toLocaleDateString('ar')}</TableCell>
                      <TableCell className="font-bold">{payment.amount.toLocaleString()} ر.س</TableCell>
                      <TableCell>
                        <Badge variant={
                          payment.payment_type === PAYMENT_TYPES.CASH ? 'default' :
                          payment.payment_type === PAYMENT_TYPES.BANK ? 'secondary' :
                          payment.payment_type === PAYMENT_TYPES.NETWORK ? 'outline' :
                          'destructive'
                        }>
                          {payment.payment_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{payment.invoices?.invoice_number || payment.orders?.order_number || '-'}</TableCell>
                      <TableCell>
                        {payment.payment_type === PAYMENT_TYPES.CASH && 'النقدية'}
                        {payment.payment_type === PAYMENT_TYPES.BANK && 'البنك'} 
                        {payment.payment_type === PAYMENT_TYPES.NETWORK && 'الشبكة'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountsOverview;