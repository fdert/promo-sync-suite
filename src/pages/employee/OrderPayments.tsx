// @ts-nocheck
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Plus, CreditCard, Receipt, TrendingUp, DollarSign, Wallet, Building } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Order {
  id: string;
  order_number: string;
  service_name: string;
  amount: number;
  status: string;
  created_at: string;
  customer: {
    name: string;
    company?: string;
  };
}

interface Payment {
  id: string;
  amount: number;
  payment_type: string;
  payment_date: string;
  notes?: string;
  created_at: string;
}

interface Account {
  id: string;
  account_name: string;
  account_type: string;
  balance: number;
}

interface AccountEntry {
  id: string;
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  description: string;
  created_at: string;
  accounts: {
    account_name: string;
    account_type: string;
  };
}

interface PaymentForm {
  amount: number;
  payment_type: string;
  notes: string;
}

const OrderPayments = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountEntries, setAccountEntries] = useState<AccountEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    amount: 0,
    payment_type: 'cash',
    notes: ''
  });

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingAmount = order ? order.amount - totalPaid : 0;

  useEffect(() => {
    if (orderId) {
      fetchOrderData();
      fetchPayments();
      fetchAccounts();
      fetchAccountEntries();
    }
  }, [orderId]);

  const fetchOrderData = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          service_name,
          amount,
          status,
          created_at,
          customers (
            name,
            company
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      setOrder({
        ...data,
        customer: data.customers as any
      });
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('خطأ في جلب بيانات الطلب');
    }
  };

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('خطأ في جلب بيانات المدفوعات');
    }
  };

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .order('account_name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchAccountEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('account_entries')
        .select(`
          *,
          accounts (
            account_name,
            account_type
          )
        `)
        .eq('reference_type', 'دفعة')
        .in('reference_id', payments.map(p => p.id))
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccountEntries(data || []);
    } catch (error) {
      console.error('Error fetching account entries:', error);
    }
  };

  const handleAddPayment = async () => {
    if (!orderId || paymentForm.amount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }

    if (paymentForm.amount > remainingAmount) {
      toast.error('المبلغ المدخل أكبر من المبلغ المستحق');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          order_id: orderId,
          amount: paymentForm.amount,
          payment_type: paymentForm.payment_type,
          payment_date: new Date().toISOString().split('T')[0],
          notes: paymentForm.notes,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('تم إضافة الدفعة بنجاح');
      setPaymentForm({ amount: 0, payment_type: 'نقدي', notes: '' });
      setShowAddPayment(false);
      
      // إعادة جلب البيانات
      await Promise.all([
        fetchPayments(),
        fetchAccounts(),
        fetchAccountEntries()
      ]);
    } catch (error) {
      console.error('Error adding payment:', error);
      toast.error('خطأ في إضافة الدفعة');
    } finally {
      setSaving(false);
    }
  };

  const getPaymentStatusColor = (amount: number, total: number) => {
    const percentage = (amount / total) * 100;
    if (percentage >= 100) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'cash': 'نقدي',
      'bank_transfer': 'تحويل بنكي',
      'card': 'الشبكة',
      'check': 'شيك'
    };
    return labels[type] || type;
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'أصول': return <Wallet className="h-4 w-4" />;
      case 'خصوم': return <CreditCard className="h-4 w-4" />;
      case 'حقوق الملكية': return <Building className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <p className="text-center text-muted-foreground">لم يتم العثور على الطلب</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">مدفوعات الطلب #{order.order_number}</h1>
          <p className="text-muted-foreground">
            إدارة المدفوعات والحسابات المالية
          </p>
        </div>
      </div>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            تفاصيل الطلب
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">العميل</p>
              <p className="font-medium">{order.customer.name}</p>
              {order.customer.company && (
                <p className="text-sm text-muted-foreground">{order.customer.company}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">الخدمة</p>
              <p className="font-medium">{order.service_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">المبلغ الإجمالي</p>
              <p className="font-medium text-lg">{order.amount.toLocaleString()} ر.س</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">المبلغ المتبقي</p>
              <p className={`font-medium text-lg ${getPaymentStatusColor(totalPaid, order.amount)}`}>
                {remainingAmount.toLocaleString()} ر.س
              </p>
            </div>
          </div>
          
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((totalPaid / order.amount) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            مدفوع: {((totalPaid / order.amount) * 100).toFixed(1)}%
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="payments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="payments">المدفوعات</TabsTrigger>
          <TabsTrigger value="accounts">الحسابات المالية</TabsTrigger>
          <TabsTrigger value="entries">القيود المحاسبية</TabsTrigger>
        </TabsList>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">سجل المدفوعات</h3>
            <Dialog open={showAddPayment} onOpenChange={setShowAddPayment}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  إضافة دفعة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة دفعة جديدة</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amount">المبلغ</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({
                        ...paymentForm,
                        amount: parseFloat(e.target.value) || 0
                      })}
                      placeholder="أدخل المبلغ"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      المبلغ المتبقي: {remainingAmount.toLocaleString()} ر.س
                    </p>
                  </div>
                  <div>
                    <Label>طريقة الدفع</Label>
                    <Select value={paymentForm.payment_type} onValueChange={(value) => 
                      setPaymentForm({ ...paymentForm, payment_type: value })
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">نقدي</SelectItem>
                        <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                        <SelectItem value="card">الشبكة</SelectItem>
                        <SelectItem value="check">شيك</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="notes">ملاحظات</Label>
                    <Textarea
                      id="notes"
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({
                        ...paymentForm,
                        notes: e.target.value
                      })}
                      placeholder="ملاحظات اختيارية"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddPayment} disabled={saving} className="flex-1">
                      {saving ? 'جاري الحفظ...' : 'حفظ الدفعة'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddPayment(false)}>
                      إلغاء
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>طريقة الدفع</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الملاحظات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        لا توجد مدفوعات لهذا الطلب
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {payment.amount.toLocaleString()} ر.س
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{getPaymentTypeLabel(payment.payment_type)}</Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ar })}
                        </TableCell>
                        <TableCell>{payment.notes || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          <h3 className="text-lg font-semibold">الحسابات المالية</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <Card key={account.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {getAccountTypeIcon(account.account_type)}
                    <h4 className="font-medium">{account.account_name}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{account.account_type}</p>
                  <p className="text-lg font-bold">
                    {account.balance.toLocaleString()} ر.س
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Account Entries Tab */}
        <TabsContent value="entries" className="space-y-4">
          <h3 className="text-lg font-semibold">القيود المحاسبية المرتبطة</h3>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الحساب</TableHead>
                    <TableHead>نوع الحساب</TableHead>
                    <TableHead>مدين</TableHead>
                    <TableHead>دائن</TableHead>
                    <TableHead>البيان</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        لا توجد قيود محاسبية
                      </TableCell>
                    </TableRow>
                  ) : (
                    accountEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {entry.accounts.account_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.accounts.account_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {entry.debit_amount > 0 ? `${entry.debit_amount.toLocaleString()} ر.س` : '-'}
                        </TableCell>
                        <TableCell>
                          {entry.credit_amount > 0 ? `${entry.credit_amount.toLocaleString()} ر.س` : '-'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {entry.description}
                        </TableCell>
                        <TableCell>
                          {format(new Date(entry.created_at), 'dd/MM/yyyy', { locale: ar })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrderPayments;