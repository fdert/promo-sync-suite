import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, XCircle, Clock, Send, FileText } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useState } from "react";

interface InstallmentPlanDetailsProps {
  planId: string;
  onUpdate: () => void;
}

const InstallmentPlanDetails = ({ planId, onUpdate }: InstallmentPlanDetailsProps) => {
  const { toast } = useToast();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<{
    id: string;
    amount: number;
    number: number;
  } | null>(null);
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>("");

  // جلب تفاصيل الخطة
  const { data: plan } = useQuery({
    queryKey: ['installment-plan', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('installment_plans')
        .select(`
          id,
          order_id,
          customer_id,
          total_amount,
          number_of_installments,
          status,
          notes,
          created_at,
          updated_at,
          created_by,
          contract_number,
          contract_token,
          contract_status,
          contract_confirmed_at,
          contract_confirmed_ip,
          orders (
            order_number,
            total_amount,
            customers (
              name,
              phone,
              whatsapp
            )
          )
        `)
        .eq('id', planId)
        .single();

      if (error) throw error;
      return data as any;
    }
  });

  // جلب الأقساط
  const { data: installments, refetch: refetchInstallments } = useQuery({
    queryKey: ['installment-payments', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('installment_payments')
        .select('*')
        .eq('installment_plan_id', planId)
        .order('installment_number', { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  // جلب أنواع الحسابات النشطة
  const { data: accountTypes } = useQuery({
    queryKey: ['active-account-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('account_type')
        .eq('is_active', true)
        .in('account_type', ['نقدية', 'بنك', 'الشبكة']);

      if (error) throw error;
      // إزالة التكرارات
      return [...new Set(data.map(a => a.account_type))];
    }
  });

  const openPaymentDialog = (installmentId: string, amount: number, installmentNumber: number) => {
    setSelectedInstallment({ id: installmentId, amount, number: installmentNumber });
    setSelectedPaymentType("");
    setPaymentDialogOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedInstallment || !selectedPaymentType) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار طريقة الدفع",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!plan) {
        toast({
          title: "خطأ",
          description: "لا يمكن العثور على تفاصيل الخطة",
          variant: "destructive",
        });
        return;
      }

      console.log('خطة التقسيط:', plan);
      
      const paymentTypeMap: Record<string, 'cash' | 'bank_transfer' | 'card'> = {
        'نقدية': 'cash',
        'بنك': 'bank_transfer',
        'الشبكة': 'card',
      };

      // تسجيل الدفعة في جدول المدفوعات العامة
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: plan.order_id,
          customer_id: plan.customer_id,
          amount: selectedInstallment.amount,
          payment_type: paymentTypeMap[selectedPaymentType] || 'cash',
          payment_date: new Date().toISOString().split('T')[0],
          notes: `دفعة قسط ${selectedInstallment.number} - خطة تقسيط`,
          created_by: user?.id,
        })
        .select('id')
        .single();

      if (paymentError) {
        console.error('خطأ في إدراج الدفعة:', paymentError);
        throw paymentError;
      }

      console.log('تم إدراج الدفعة:', paymentData);

      // تحديث حالة القسط وربطه بالدفعة
      const { error: updateError } = await supabase
        .from('installment_payments')
        .update({
          status: 'paid',
          paid_amount: selectedInstallment.amount,
          paid_date: new Date().toISOString().split('T')[0],
          payment_id: paymentData.id,
        })
        .eq('id', selectedInstallment.id);

      if (updateError) {
        console.error('خطأ في تحديث القسط:', updateError);
        throw updateError;
      }

      // إنشاء القيود المحاسبية بنفس منطق شاشة مدفوعات الطلب
      try {
        const accountType = selectedPaymentType;

        const { data: cashAccount } = await supabase
          .from('accounts')
          .select('id')
          .eq('account_type', accountType)
          .eq('is_active', true)
          .limit(1)
          .single();

        const { data: receivableAccount } = await supabase
          .from('accounts')
          .select('id')
          .eq('account_type', 'ذمم مدينة')
          .eq('is_active', true)
          .limit(1)
          .single();

        if (cashAccount && receivableAccount) {
          await supabase.from('account_entries').insert([
            {
              account_id: cashAccount.id,
              debit: selectedInstallment.amount,
              credit: 0,
              reference_type: 'payment',
              reference_id: paymentData.id,
              description: `دفعة قسط ${selectedInstallment.number} للطلب - ${selectedPaymentType}`,
              entry_date: new Date().toISOString().split('T')[0],
              created_by: user?.id,
            },
            {
              account_id: receivableAccount.id,
              debit: 0,
              credit: selectedInstallment.amount,
              reference_type: 'payment',
              reference_id: paymentData.id,
              description: `دفعة قسط ${selectedInstallment.number} من العميل للطلب`,
              entry_date: new Date().toISOString().split('T')[0],
              created_by: user?.id,
            },
          ]);
        }
      } catch (accountError) {
        console.error('خطأ في تسجيل القيود المحاسبية:', accountError);
        // لا نفشل عملية تسجيل الدفعة بسبب خطأ في المحاسبة
      }

      // إرسال رسالة واتساب للعميل بالقالب
      if (plan?.orders?.customers) {
        const customerPhone = plan.orders.customers.whatsapp || plan.orders.customers.phone;
        if (customerPhone) {
          // جلب القالب من قاعدة البيانات
          const { data: template } = await supabase
            .from('message_templates')
            .select('content')
            .eq('name', 'installment_payment_received')
            .eq('is_active', true)
            .single();

          let messageContent = template?.content || 
            `✅ تم استلام دفعة القسط بنجاح!\n\n` +
            `📋 رقم الطلب: {{order_number}}\n` +
            `💰 المبلغ المدفوع: {{amount}}\n` +
            `💳 طريقة الدفع: {{payment_method}}\n` +
            `📅 التاريخ: {{payment_date}}\n\n` +
            `شكراً لالتزامك بالسداد! 🙏`;

          // استبدال المتغيرات
          messageContent = messageContent
            .replace(/\{\{order_number\}\}/g, plan.orders.order_number)
            .replace(/\{\{amount\}\}/g, formatCurrency(selectedInstallment.amount))
            .replace(/\{\{payment_method\}\}/g, selectedPaymentType)
            .replace(/\{\{payment_date\}\}/g, format(new Date(), 'dd/MM/yyyy', { locale: ar }));

          await supabase.from('whatsapp_messages').insert({
            to_number: customerPhone,
            message_content: messageContent,
            message_type: 'installment_payment',
            status: 'pending',
          });

          // تشغيل معالج الرسائل
          await supabase.functions.invoke('process-whatsapp-queue', {
            body: {}
          });
        }
      }

      toast({
        title: "تم بنجاح",
        description: "تم تسجيل الدفعة وإرسال إشعار للعميل",
      });

      setPaymentDialogOpen(false);
      setSelectedInstallment(null);
      setSelectedPaymentType("");
      refetchInstallments();
      onUpdate();
    } catch (error: any) {
      console.error('Error marking installment as paid:', error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء تسجيل الدفعة",
        variant: "destructive",
      });
    }
  };

  const handleSendReminder = async (installmentId: string, dueDate: string, amount: number) => {
    try {
      if (!plan?.orders?.customers) return;

      const customerPhone = plan.orders.customers.whatsapp || plan.orders.customers.phone;
      if (!customerPhone) {
        toast({
          title: "خطأ",
          description: "لا يوجد رقم واتساب للعميل",
          variant: "destructive",
        });
        return;
      }

      // جلب رقم القسط
      const installment = installments?.find(i => i.id === installmentId);
      const installmentNumber = installment?.installment_number || '1';

      // جلب القالب من قاعدة البيانات
      const { data: template } = await supabase
        .from('message_templates')
        .select('content')
        .eq('name', 'installment_reminder')
        .eq('is_active', true)
        .single();

      let messageContent = template?.content || 
        `🔔 تذكير بموعد دفع القسط\n\n` +
        `📋 رقم الطلب: {{order_number}}\n` +
        `💰 المبلغ المطلوب: {{amount}}\n` +
        `📅 موعد الاستحقاق: {{due_date}}\n` +
        `📝 رقم القسط: {{installment_number}}\n\n` +
        `يرجى السداد في الموعد المحدد. شكراً لك! 🙏`;

      // استبدال المتغيرات
      messageContent = messageContent
        .replace(/\{\{order_number\}\}/g, plan.orders.order_number)
        .replace(/\{\{amount\}\}/g, formatCurrency(amount))
        .replace(/\{\{due_date\}\}/g, format(new Date(dueDate), 'dd/MM/yyyy', { locale: ar }))
        .replace(/\{\{installment_number\}\}/g, installmentNumber.toString());

      await supabase.from('whatsapp_messages').insert({
        to_number: customerPhone,
        message_content: messageContent,
        message_type: 'installment_reminder',
        status: 'pending',
      });

      // تشغيل معالج الرسائل
      await supabase.functions.invoke('process-whatsapp-queue', {
        body: {}
      });

      toast({
        title: "تم بنجاح",
        description: "تم إرسال التذكير للعميل",
      });
    } catch (error: any) {
      console.error('Error sending reminder:', error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء إرسال التذكير",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      pending: { icon: Clock, className: "bg-warning/10 text-warning", label: "قيد الانتظار" },
      paid: { icon: CheckCircle2, className: "bg-success/10 text-success", label: "مدفوع" },
      overdue: { icon: XCircle, className: "bg-destructive/10 text-destructive", label: "متأخر" },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 ml-1" />
        {config.label}
      </Badge>
    );
  };

  if (!plan) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* معلومات الخطة */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>معلومات الخطة</CardTitle>
          {plan.contract_token && (
            <Button
              variant="outline"
              onClick={() => {
                window.open(`/installment-contract/${plan.contract_token}`, '_blank');
              }}
            >
              <FileText className="h-4 w-4 ml-2" />
              عرض العقد
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">رقم الطلب</p>
              <p className="font-medium">{plan.orders.order_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">اسم العميل</p>
              <p className="font-medium">{plan.orders.customers.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المبلغ</p>
              <p className="font-medium">{formatCurrency(plan.total_amount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">عدد الأقساط</p>
              <p className="font-medium">{plan.number_of_installments} قسط</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">رقم العقد</p>
              <p className="font-medium">{plan.contract_number || 'غير محدد'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">حالة العقد</p>
              <p className="font-medium">
                {plan.contract_status === 'confirmed' ? '✅ مؤكد' : 
                 plan.contract_status === 'pending' ? '⏳ قيد الانتظار' : 'غير محدد'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* جدول الأقساط */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل الأقساط</CardTitle>
        </CardHeader>
        <CardContent>
          {installments && installments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم القسط</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>تاريخ الاستحقاق</TableHead>
                  <TableHead>تاريخ الدفع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.map((installment) => (
                  <TableRow key={installment.id}>
                    <TableCell>القسط {installment.installment_number}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(installment.amount)}</TableCell>
                    <TableCell>
                      {format(new Date(installment.due_date), 'dd/MM/yyyy', { locale: ar })}
                    </TableCell>
                    <TableCell>
                      {installment.paid_date 
                        ? format(new Date(installment.paid_date), 'dd/MM/yyyy', { locale: ar })
                        : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(installment.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {installment.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => openPaymentDialog(installment.id, installment.amount, installment.installment_number)}
                            >
                              <CheckCircle2 className="h-4 w-4 ml-1" />
                              تسجيل الدفع
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendReminder(installment.id, installment.due_date, installment.amount)}
                            >
                              <Send className="h-4 w-4 ml-1" />
                              تذكير
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد أقساط
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog لاختيار طريقة الدفع */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تسجيل دفعة القسط</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                القسط رقم: <span className="font-medium text-foreground">{selectedInstallment?.number}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                المبلغ: <span className="font-medium text-foreground">{selectedInstallment && formatCurrency(selectedInstallment.amount)}</span>
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">طريقة الدفع</label>
              <Select value={selectedPaymentType} onValueChange={setSelectedPaymentType}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر طريقة الدفع" />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes?.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setPaymentDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleConfirmPayment}
                disabled={!selectedPaymentType}
              >
                <CheckCircle2 className="h-4 w-4 ml-1" />
                تأكيد الدفع
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstallmentPlanDetails;