import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Edit, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Payment {
  id: string;
  amount: number;
  payment_type: string;
  payment_date: string;
  notes?: string;
}

interface OrderDetails {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  amount: number;
  calculated_paid_amount: number;
  remaining_amount: number;
}

const OrderPayments = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  
  // نموذج الدفعة الجديدة
  const [newPayment, setNewPayment] = useState({
    amount: '',
    payment_type: 'نقدي',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const fetchOrderData = async () => {
    if (!orderId) return;
    
    try {
      setLoading(true);
      
      // جلب تفاصيل الطلب
      const { data: orderData, error: orderError } = await supabase
        .from('order_payment_summary')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // جلب اسم العميل
      if (orderData.customer_id) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('name, phone')
          .eq('id', orderData.customer_id)
          .single();

        if (customerData) {
          setOrderDetails({
            id: orderData.id,
            order_number: orderData.order_number || '',
            customer_name: customerData.name || 'غير محدد',
            customer_phone: customerData.phone || '',
            service_name: orderData.service_name || '',
            amount: orderData.amount || 0,
            calculated_paid_amount: orderData.calculated_paid_amount || 0,
            remaining_amount: orderData.remaining_amount || 0
          });
        }
      }

      // جلب المدفوعات
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      setPayments(paymentsData || []);
    } catch (error) {
      console.error('Error fetching order data:', error);
      toast.error('حدث خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePayment = async () => {
    try {
      if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
        toast.error('يرجى إدخال مبلغ صحيح');
        return;
      }

      const paymentData = {
        order_id: orderId,
        amount: parseFloat(newPayment.amount),
        payment_type: newPayment.payment_type,
        payment_date: newPayment.payment_date,
        notes: newPayment.notes || null
      };

      if (editingPayment) {
        // تحديث دفعة موجودة
        const { error } = await supabase
          .from('payments')
          .update(paymentData)
          .eq('id', editingPayment.id);

        if (error) throw error;
        toast.success('تم تحديث الدفعة بنجاح');
      } else {
        // إضافة دفعة جديدة
        const { error } = await supabase
          .from('payments')
          .insert(paymentData);

        if (error) throw error;
        toast.success('تم إضافة الدفعة بنجاح');
      }

      setIsDialogOpen(false);
      setEditingPayment(null);
      setNewPayment({
        amount: '',
        payment_type: 'نقدي',
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      
      fetchOrderData();
    } catch (error) {
      console.error('Error saving payment:', error);
      toast.error('حدث خطأ في حفظ الدفعة');
    }
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setNewPayment({
      amount: payment.amount.toString(),
      payment_type: payment.payment_type,
      payment_date: payment.payment_date,
      notes: payment.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الدفعة؟')) return;

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      toast.success('تم حذف الدفعة بنجاح');
      fetchOrderData();
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('حدث خطأ في حذف الدفعة');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  useEffect(() => {
    fetchOrderData();
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">لم يتم العثور على الطلب</p>
            <Button onClick={() => navigate('/admin/financial-movements')} className="mt-4">
              العودة للحركة المالية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/admin/financial-movements')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          العودة
        </Button>
        <div>
          <h1 className="text-3xl font-bold">إدارة مدفوعات الطلب</h1>
          <p className="text-muted-foreground">رقم الطلب: {orderDetails.order_number}</p>
        </div>
      </div>

      {/* معلومات الطلب */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل الطلب</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>اسم العميل</Label>
              <p className="font-medium">{orderDetails.customer_name}</p>
            </div>
            <div>
              <Label>رقم الجوال</Label>
              <p className="font-medium">{orderDetails.customer_phone}</p>
            </div>
            <div>
              <Label>اسم الخدمة</Label>
              <p className="font-medium">{orderDetails.service_name}</p>
            </div>
            <div>
              <Label>المبلغ الإجمالي</Label>
              <p className="font-medium text-lg">{formatCurrency(orderDetails.amount)}</p>
            </div>
            <div>
              <Label>المبلغ المدفوع</Label>
              <p className="font-medium text-lg text-green-600">{formatCurrency(orderDetails.calculated_paid_amount)}</p>
            </div>
            <div>
              <Label>المبلغ المتبقي</Label>
              <p className={`font-medium text-lg ${orderDetails.remaining_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(orderDetails.remaining_amount)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* المدفوعات */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>المدفوعات ({payments.length})</CardTitle>
              <CardDescription>قائمة جميع المدفوعات المسجلة لهذا الطلب</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={() => {
                  setEditingPayment(null);
                  setNewPayment({
                    amount: '',
                    payment_type: 'نقدي',
                    payment_date: new Date().toISOString().split('T')[0],
                    notes: ''
                  });
                }}>
                  <Plus className="h-4 w-4" />
                  إضافة دفعة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingPayment ? 'تعديل الدفعة' : 'إضافة دفعة جديدة'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingPayment ? 'قم بتعديل تفاصيل الدفعة' : 'أدخل تفاصيل الدفعة الجديدة'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>المبلغ</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>نوع الدفع</Label>
                    <Select value={newPayment.payment_type} onValueChange={(value) => setNewPayment(prev => ({ ...prev, payment_type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="نقدي">نقدي</SelectItem>
                        <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
                        <SelectItem value="الشبكة">الشبكة</SelectItem>
                        <SelectItem value="شيك">شيك</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>تاريخ الدفع</Label>
                    <Input
                      type="date"
                      value={newPayment.payment_date}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, payment_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>ملاحظات</Label>
                    <Input
                      placeholder="ملاحظات اختيارية..."
                      value={newPayment.notes}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    إلغاء
                  </Button>
                  <Button onClick={handleSavePayment} className="gap-2">
                    <Save className="h-4 w-4" />
                    {editingPayment ? 'تحديث' : 'حفظ'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>نوع الدفع</TableHead>
                  <TableHead>تاريخ الدفع</TableHead>
                  <TableHead>الملاحظات</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium text-green-600">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>{payment.payment_type}</TableCell>
                    <TableCell>
                      {format(new Date(payment.payment_date), 'yyyy-MM-dd', { locale: ar })}
                    </TableCell>
                    <TableCell>{payment.notes || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPayment(payment)}
                          className="gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          تعديل
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePayment(payment.id)}
                          className="gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          حذف
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {payments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      لا توجد مدفوعات مسجلة لهذا الطلب
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderPayments;