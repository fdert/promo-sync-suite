import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface CreateInstallmentPlanProps {
  onSuccess: () => void;
}

const CreateInstallmentPlan = ({ onSuccess }: CreateInstallmentPlanProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [numberOfInstallments, setNumberOfInstallments] = useState("3");
  const [firstPaymentDate, setFirstPaymentDate] = useState<Date>(new Date());
  const [installmentDates, setInstallmentDates] = useState<Date[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // البحث عن الطلبات
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      
      // البحث في الطلبات والعملاء
      const { data: allOrders, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          paid_amount,
          customers (
            id,
            name,
            phone,
            whatsapp
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // فلترة النتائج بناءً على البحث في اسم العميل أو رقم الطلب أو رقم الجوال
      const filteredOrders = (allOrders || []).filter((order: any) => {
        const searchLower = searchTerm.toLowerCase();
        const orderNumber = order.order_number?.toLowerCase() || '';
        const customerName = order.customers?.name?.toLowerCase() || '';
        const phone = order.customers?.phone?.toLowerCase() || '';
        const whatsapp = order.customers?.whatsapp?.toLowerCase() || '';
        
        return orderNumber.includes(searchLower) || 
               customerName.includes(searchLower) || 
               phone.includes(searchLower) || 
               whatsapp.includes(searchLower);
      });
      
      // فلترة الطلبات التي ليس لها خطة تقسيط بالفعل
      const ordersWithoutPlans = [];
      for (const order of filteredOrders.slice(0, 10)) {
        const { data: existingPlan } = await supabase
          .from('installment_plans')
          .select('id')
          .eq('order_id', order.id)
          .maybeSingle();
        
        if (!existingPlan) {
          ordersWithoutPlans.push(order);
        }
      }
      
      return ordersWithoutPlans;
    },
    enabled: searchTerm.length >= 2
  });

  const calculateInstallmentDates = (numInstallments: number, startDate: Date) => {
    const dates: Date[] = [];
    for (let i = 0; i < numInstallments; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      dates.push(date);
    }
    return dates;
  };

  const handleNumberOfInstallmentsChange = (value: string) => {
    setNumberOfInstallments(value);
    const dates = calculateInstallmentDates(parseInt(value), firstPaymentDate);
    setInstallmentDates(dates);
  };

  const handleFirstPaymentDateChange = (date: Date | undefined) => {
    if (date) {
      setFirstPaymentDate(date);
      const dates = calculateInstallmentDates(parseInt(numberOfInstallments), date);
      setInstallmentDates(dates);
    }
  };

  const handleSubmit = async () => {
    if (!selectedOrder) {
      toast({
        title: "خطأ",
        description: "الرجاء اختيار طلب أولاً",
        variant: "destructive",
      });
      return;
    }

    if (installmentDates.length === 0) {
      toast({
        title: "خطأ",
        description: "الرجاء تحديد عدد الأقساط وتاريخ أول دفعة",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // حساب المبلغ المتبقي
      const remainingAmount = (selectedOrder.total_amount || 0) - (selectedOrder.paid_amount || 0);
      const installmentAmount = remainingAmount / parseInt(numberOfInstallments);

      // توليد رقم عقد ورمز فريد
      const contractToken = crypto.randomUUID();
      const contractNumber = `INS-${Date.now().toString().slice(-8)}`;
      
      // إنشاء خطة التقسيط
      const { data: plan, error: planError } = await supabase
        .from('installment_plans')
        .insert({
          order_id: selectedOrder.id,
          customer_id: selectedOrder.customers.id,
          total_amount: remainingAmount,
          number_of_installments: parseInt(numberOfInstallments),
          created_by: user?.id,
          notes: `CONTRACT_TOKEN:${contractToken}|CONTRACT_NUMBER:${contractNumber}`,
        })
        .select()
        .single();

      if (planError) throw planError;

      // إنشاء الأقساط
      const installments = installmentDates.map((date, index) => ({
        installment_plan_id: plan.id,
        installment_number: index + 1,
        amount: installmentAmount,
        due_date: format(date, 'yyyy-MM-dd'),
      }));

      const { error: installmentsError } = await supabase
        .from('installment_payments')
        .insert(installments);

      if (installmentsError) throw installmentsError;

      // إرسال رسالة واتساب للعميل مع رابط العقد
      const customerPhone = selectedOrder.customers.whatsapp || selectedOrder.customers.phone;
      if (customerPhone) {
        const installmentsList = installmentDates.map((date, index) => 
          `القسط ${index + 1}: ${format(date, 'dd/MM/yyyy', { locale: ar })} - ${new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(installmentAmount)}`
        ).join('\n');

        // رابط العقد - استخدام رابط production مباشر
        const contractUrl = `https://e5a7747a-0935-46df-9ea9-1308e76636dc.lovableproject.com/installment-contract/${contractToken}`;

        // جلب القالب من قاعدة البيانات
        const { data: template } = await supabase
          .from('message_templates')
          .select('content')
          .eq('name', 'installment_plan_created')
          .eq('is_active', true)
          .single();

        let messageContent = template?.content || 
          `🎉 تم إنشاء خطة تقسيط لطلبك!\n\n` +
          `📋 رقم الطلب: {{order_number}}\n` +
          `💰 إجمالي المبلغ المتبقي: {{total_amount}}\n` +
          `📅 عدد الأقساط: {{number_of_installments}}\n\n` +
          `تفاصيل الأقساط:\n{{installments_list}}\n\n` +
          `📄 لعرض عقد التقسيط الإلكتروني والموافقة عليه:\n{{contract_url}}\n\n` +
          `سيتم تذكيرك قبل كل دفعة بيومين وبيوم واحد.`;

        // استبدال المتغيرات
        messageContent = messageContent
          .replace(/\{\{order_number\}\}/g, selectedOrder.order_number)
          .replace(/\{\{total_amount\}\}/g, formatCurrency(remainingAmount))
          .replace(/\{\{number_of_installments\}\}/g, numberOfInstallments)
          .replace(/\{\{installments_list\}\}/g, installmentsList)
          .replace(/\{\{contract_url\}\}/g, contractUrl);

        await supabase.from('whatsapp_messages').insert({
          to_number: customerPhone,
          message_content: messageContent,
          message_type: 'installment_plan',
          customer_id: selectedOrder.customers.id,
          status: 'pending',
        });

        // تشغيل معالج الرسائل
        await supabase.functions.invoke('process-whatsapp-queue', {
          body: {}
        });
      }

      toast({
        title: "تم بنجاح",
        description: "تم إنشاء خطة التقسيط وإرسال التفاصيل للعميل",
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error creating installment plan:', error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء إنشاء خطة التقسيط",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      {/* البحث عن الطلب */}
      <div className="space-y-2">
        <Label>البحث عن طلب</Label>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ابحث برقم الطلب..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        {isLoading && <p className="text-sm text-muted-foreground">جاري البحث...</p>}
        {orders && orders.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {orders.map((order: any) => (
              <Card 
                key={order.id} 
                className={`cursor-pointer transition-all ${selectedOrder?.id === order.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                onClick={() => {
                  setSelectedOrder(order);
                  setSearchTerm("");
                }}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{order.customers.name}</p>
                      <p className="text-sm text-muted-foreground">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.customers.phone || order.customers.whatsapp}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-muted-foreground">الإجمالي</p>
                      <p className="font-medium">{formatCurrency(order.total_amount)}</p>
                      <p className="text-sm text-success">مدفوع: {formatCurrency(order.paid_amount)}</p>
                      <p className="text-sm text-warning">
                        متبقي: {formatCurrency((order.total_amount || 0) - (order.paid_amount || 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedOrder && (
        <>
          {/* تفاصيل الطلب المختار */}
          <Card className="bg-primary/5 border-primary">
            <CardContent className="p-4">
              <h3 className="font-medium mb-2">الطلب المختار</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">رقم الطلب</p>
                  <p className="font-medium">{selectedOrder.order_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">العميل</p>
                  <p className="font-medium">{selectedOrder.customers.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">المبلغ المتبقي</p>
                  <p className="font-medium text-warning">
                    {formatCurrency((selectedOrder.total_amount || 0) - (selectedOrder.paid_amount || 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* إعدادات الأقساط */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>عدد الأقساط</Label>
              <Select value={numberOfInstallments} onValueChange={handleNumberOfInstallmentsChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 9, 12, 18, 24].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} أقساط
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>تاريخ أول قسط</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {format(firstPaymentDate, 'PPP', { locale: ar })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={firstPaymentDate}
                    onSelect={handleFirstPaymentDateChange}
                    initialFocus
                    locale={ar}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* جدول الأقساط */}
          {installmentDates.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-4">جدول الأقساط</h3>
                <div className="space-y-2">
                  {installmentDates.map((date, index) => {
                    const amount = ((selectedOrder.total_amount || 0) - (selectedOrder.paid_amount || 0)) / parseInt(numberOfInstallments);
                    return (
                      <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span>القسط {index + 1}</span>
                        <span className="text-muted-foreground">
                          {format(date, 'dd/MM/yyyy', { locale: ar })}
                        </span>
                        <span className="font-medium">{formatCurrency(amount)}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* زر الإنشاء */}
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "جاري الإنشاء..." : "إنشاء خطة التقسيط وإرسال التفاصيل"}
          </Button>
        </>
      )}
    </div>
  );
};

export default CreateInstallmentPlan;