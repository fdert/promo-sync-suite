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
import { CheckCircle2, XCircle, Clock, Send } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface InstallmentPlanDetailsProps {
  planId: string;
  onUpdate: () => void;
}

const InstallmentPlanDetails = ({ planId, onUpdate }: InstallmentPlanDetailsProps) => {
  const { toast } = useToast();

  // جلب تفاصيل الخطة
  const { data: plan } = useQuery({
    queryKey: ['installment-plan', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('installment_plans')
        .select(`
          *,
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
      return data;
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

  const handleMarkAsPaid = async (installmentId: string, amount: number, installmentNumber: number) => {
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
      
      // تسجيل الدفعة في جدول المدفوعات العامة
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: plan.order_id,
          customer_id: plan.customer_id,
          amount: amount,
          payment_type: 'cash',
          payment_date: new Date().toISOString().split('T')[0],
          notes: `دفعة قسط ${installmentNumber} - خطة تقسيط`,
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
          paid_amount: amount,
          paid_date: new Date().toISOString().split('T')[0],
          payment_id: paymentData.id,
        })
        .eq('id', installmentId);

      if (updateError) {
        console.error('خطأ في تحديث القسط:', updateError);
        throw updateError;
      }

      // تسجيل القيد المحاسبي
      try {
        // جلب حساب العميل أو إنشاؤه
        const { data: customerAccount } = await supabase
          .from('accounts')
          .select('id')
          .eq('account_type', 'customer')
          .ilike('account_name', `%${plan.customer_id}%`)
          .maybeSingle();

        if (customerAccount) {
          // إدراج قيد دائن في حساب العميل (تقليل رصيده المدين)
          await supabase
            .from('account_entries')
            .insert({
              account_id: customerAccount.id,
              credit: amount,
              debit: 0,
              description: `دفعة قسط ${installmentNumber} - طلب ${plan.orders.order_number}`,
              entry_date: new Date().toISOString().split('T')[0],
              reference_type: 'installment_payment',
              reference_id: installmentId,
              created_by: user?.id,
            });
        }
      } catch (accountError) {
        console.error('خطأ في تسجيل القيد المحاسبي:', accountError);
        // لا نفشل العملية بسبب خطأ في المحاسبة
      }

      // إرسال رسالة واتساب للعميل
      if (plan?.orders?.customers) {
        const customerPhone = plan.orders.customers.whatsapp || plan.orders.customers.phone;
        if (customerPhone) {
          await supabase.from('whatsapp_messages').insert({
            to_number: customerPhone,
            message_content: `✅ تم استلام دفعة القسط بنجاح!\n\n` +
              `📋 رقم الطلب: ${plan.orders.order_number}\n` +
              `💰 المبلغ المدفوع: ${formatCurrency(amount)}\n` +
              `📅 التاريخ: ${format(new Date(), 'dd/MM/yyyy', { locale: ar })}\n\n` +
              `شكراً لالتزامك بالسداد! 🙏`,
            status: 'pending',
          });

          // تشغيل معالج الرسائل
          await fetch(`https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/process-whatsapp-queue`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcnprZnBvd2p1dHlsZWdkY3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MzU5NzIsImV4cCI6MjA3NDQxMTk3Mn0.frZ6OBDDuqbXOmQUydyoLdCnI5n5_WnS96x2qMPNR78`,
            },
          });
        }
      }

      toast({
        title: "تم بنجاح",
        description: "تم تسجيل الدفعة وإرسال إشعار للعميل",
      });

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

      await supabase.from('whatsapp_messages').insert({
        to_number: customerPhone,
        message_content: `🔔 تذكير بموعد دفع القسط\n\n` +
          `📋 رقم الطلب: ${plan.orders.order_number}\n` +
          `💰 المبلغ المطلوب: ${formatCurrency(amount)}\n` +
          `📅 موعد الاستحقاق: ${format(new Date(dueDate), 'dd/MM/yyyy', { locale: ar })}\n\n` +
          `يرجى السداد في الموعد المحدد. شكراً لك! 🙏`,
        status: 'pending',
      });

      // تشغيل معالج الرسائل
      await fetch(`https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/process-whatsapp-queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcnprZnBvd2p1dHlsZWdkY3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MzU5NzIsImV4cCI6MjA3NDQxMTk3Mn0.frZ6OBDDuqbXOmQUydyoLdCnI5n5_WnS96x2qMPNR78`,
        },
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
        <CardHeader>
          <CardTitle>معلومات الخطة</CardTitle>
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
                              onClick={() => handleMarkAsPaid(installment.id, installment.amount, installment.installment_number)}
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
    </div>
  );
};

export default InstallmentPlanDetails;