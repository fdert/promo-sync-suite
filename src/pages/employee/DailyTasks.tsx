import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Clock, AlertCircle, UserPlus, Send, Plus, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { z } from 'zod';
import { DeliveryTimeIndicator } from '@/components/DeliveryTimeIndicator';
import { OrderDeliveryAlert } from '@/components/OrderDeliveryAlert';

interface DailyTask {
  id: string;
  order_number?: string;
  customer_name?: string;
  service_type?: string;
  status?: string;
  delivery_date?: string;
  estimated_delivery_time?: string;
  total_amount?: number;
  created_at?: string;
  created_by?: string;
  assigned_to?: string;
  title?: string;
  description?: string;
  due_date?: string;
  is_completed?: boolean;
  is_manual?: boolean;
}

interface PersonalTask {
  id: string;
  title: string;
  description?: string | null;
  task_type: 'follow_up' | 'delivery' | 'collection' | 'other';
  task_date: string;
  task_time?: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_by?: string | null;
  assigned_to?: string | null;
  order_id?: string | null;
}

interface Employee {
  id: string;
  full_name: string;
  email: string;
  phone: string;
}

const taskSchema = z.object({
  title: z.string().trim().min(1, 'العنوان مطلوب').max(200, 'العنوان طويل جداً'),
  description: z.string().trim().max(500, 'الوصف طويل جداً').optional(),
  task_type: z.enum(['follow_up', 'delivery', 'collection', 'other']),
  task_date: z.string().min(1, 'التاريخ مطلوب'),
  task_time: z.string().optional(),
});

const DailyTasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [todayDate, setTodayDate] = useState<string>('');
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
  });
  const [sendingTest, setSendingTest] = useState(false);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PersonalTask | null>(null);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    task_type: 'other' as 'follow_up' | 'delivery' | 'collection' | 'other',
    task_date: new Date().toISOString().split('T')[0],
    task_time: '',
  });

  const fetchDailyTasks = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date());
      setTodayDate(today);
      
      console.log('🔍 المهام اليومية - معلومات الجلب:', {
        userId: user.id,
        today: today,
        timezone: 'Asia/Riyadh'
      });
      
      // جلب طلبات الموظف: طلبات اليوم غير المنجزة + جميع الطلبات المتأخرة غير المكتملة
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          delivery_date,
          estimated_delivery_time,
          total_amount,
          created_at,
          created_by,
          customers (name),
          service_types (name)
        `)
        .eq('created_by', user.id)
        .lte('delivery_date', today)
        .neq('status', 'مكتمل')
        .neq('status', 'جاهز للتسليم')
        .order('delivery_date', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('📊 نتائج الجلب:', {
        ordersCount: data?.length || 0
      });

      // جلب أسماء المسؤولين (created_by) من جدول profiles بدون علاقات مباشرة
      const createdByIds = Array.from(
        new Set((data || []).map((o: any) => o.created_by).filter(Boolean))
      );

      let profilesMap: Record<string, string> = {};
      if (createdByIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', createdByIds);

        profilesMap = Object.fromEntries(
          (profilesData || []).map((p: any) => [p.id, p.full_name || 'غير محدد'])
        );
      }

      const formattedOrders = (data || []).map((order: any) => ({
        id: order.id,
        order_number: order.order_number || 'غير محدد',
        customer_name: order.customers?.name || 'غير محدد',
        service_type: order.service_types?.name || 'غير محدد',
        status: order.status,
        delivery_date: order.delivery_date,
        estimated_delivery_time: order.estimated_delivery_time,
        total_amount: order.total_amount || 0,
        created_at: order.created_at,
        created_by: order.created_by,
        assigned_to: profilesMap[order.created_by] || 'غير محدد',
        is_manual: false,
      }));

      // ترتيب الطلبات حسب قرب وقت التسليم (الأقرب أولاً)
      const sortedOrders = formattedOrders.sort((a, b) => {
        if (!a.delivery_date || !b.delivery_date) return 0;
        
        const dateTimeA = new Date(a.delivery_date);
        const dateTimeB = new Date(b.delivery_date);
        
        // إضافة الوقت إذا كان موجوداً
        if (a.estimated_delivery_time) {
          const [hours, minutes] = a.estimated_delivery_time.split(':').map(Number);
          dateTimeA.setHours(hours, minutes, 0, 0);
        } else {
          dateTimeA.setHours(17, 0, 0, 0);
        }
        
        if (b.estimated_delivery_time) {
          const [hours, minutes] = b.estimated_delivery_time.split(':').map(Number);
          dateTimeB.setHours(hours, minutes, 0, 0);
        } else {
          dateTimeB.setHours(17, 0, 0, 0);
        }
        
        // الفرق بالنسبة للوقت الحالي
        const now = new Date();
        const diffA = dateTimeA.getTime() - now.getTime();
        const diffB = dateTimeB.getTime() - now.getTime();
        
        // الطلبات المتأخرة أولاً (الأقدم تأخراً أولاً)
        if (diffA < 0 && diffB < 0) {
          return diffA - diffB; // الأكثر تأخراً أولاً
        }
        
        // الطلبات القادمة (الأقرب أولاً)
        if (diffA >= 0 && diffB >= 0) {
          return diffA - diffB; // الأقرب أولاً
        }
        
        // متأخر يأتي قبل قادم
        return diffA < 0 ? -1 : 1;
      });

      setTasks(sortedOrders);

      console.log('✅ المهام النهائية:', {
        total: formattedOrders.length,
        orders: formattedOrders.length
      });

      // حساب الإحصائيات
      const completed = formattedOrders.filter(
        t => t.status === 'مكتمل' || t.status === 'جاهز للتسليم'
      ).length;
      const pending = formattedOrders.filter(
        t => t.status !== 'مكتمل' && t.status !== 'جاهز للتسليم'
      ).length;

      // جلب المهام الخاصة من employee_tasks
      const { data: personalTasksData, error: personalTasksError } = await supabase
        .from('employee_tasks' as any)
        .select('*')
        .eq('created_by', user.id)
        .is('order_id', null)
        .order('task_date', { ascending: true })
        .order('task_time', { ascending: true });

      if (personalTasksError) {
        console.error('خطأ في جلب المهام الخاصة:', personalTasksError);
      } else {
        setPersonalTasks((personalTasksData as any) || []);
      }

      setStats({
        total: formattedOrders.length,
        completed,
        pending,
      });

    } catch (error: any) {
      console.error('Error loading tasks:', error);
      toast({
        title: 'خطأ في تحميل المهام',
        description: error?.message || 'تعذر جلب بيانات المهام اليومية',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .neq('id', user?.id || '');

      if (error) throw error;

      setEmployees(data || []);
    } catch (error: any) {
      console.error('Error loading employees:', error);
    }
  };

  const handleSendTestNotification = async () => {
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-daily-tasks-notification', {
        body: {}
      });

      if (error) throw error;

      toast({
        title: 'تم إرسال الإشعار بنجاح',
        description: `تم إرسال ${data?.notificationsSent || 0} إشعار للموظفين بمهامهم اليومية`,
      });
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      toast({
        title: 'خطأ في إرسال الإشعار',
        description: error?.message || 'تعذر إرسال إشعار الاختبار',
        variant: 'destructive',
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleAddPersonalTask = async () => {
    try {
      const validatedData = taskSchema.parse(taskFormData);
      
      if (!user) {
        toast({
          title: 'خطأ',
          description: 'يجب تسجيل الدخول أولاً',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('employee_tasks' as any)
        .insert([{
          title: validatedData.title,
          description: validatedData.description || null,
          task_type: validatedData.task_type,
          task_date: validatedData.task_date,
          task_time: validatedData.task_time || null,
          created_by: user.id,
          assigned_to: user.id,
          status: 'pending',
          order_id: null,
        }]);

      if (error) throw error;

      toast({
        title: 'تم إضافة المهمة',
        description: 'تم إضافة المهمة الخاصة بنجاح',
      });

      setIsAddTaskDialogOpen(false);
      setTaskFormData({
        title: '',
        description: '',
        task_type: 'other',
        task_date: new Date().toISOString().split('T')[0],
        task_time: '',
      });
      fetchDailyTasks();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'خطأ في البيانات',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        console.error('Error adding personal task:', error);
        toast({
          title: 'خطأ في إضافة المهمة',
          description: error?.message || 'تعذر إضافة المهمة',
          variant: 'destructive',
        });
      }
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('employee_tasks' as any)
        .update({
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'تم تحديث الحالة',
        description: 'تم تحديث حالة المهمة بنجاح',
      });

      fetchDailyTasks();
      setIsEditTaskDialogOpen(false);
      setEditingTask(null);
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({
        title: 'خطأ في التحديث',
        description: error?.message || 'تعذر تحديث المهمة',
        variant: 'destructive',
      });
    }
  };

  const handleTransferTask = async () => {
    if (!selectedTask || !selectedEmployee) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار موظف لنقل المهمة إليه',
        variant: 'destructive',
      });
      return;
    }

    try {
      // جلب بيانات الموظف الحالي (الذي قام بنقل المهمة)
      const { data: currentEmployeeData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      // تحديث الطلب ونقله للموظف الجديد
      const { error: updateError } = await supabase
        .from('orders')
        .update({ created_by: selectedEmployee })
        .eq('id', selectedTask);

      if (updateError) throw updateError;

      // جلب بيانات الموظف الجديد لإرسال إشعار واتساب
      const { data: employeeData } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', selectedEmployee)
        .single();

      // جلب بيانات الطلب
      const { data: orderData } = await supabase
        .from('orders')
        .select(`
          order_number,
          delivery_date,
          customers (name)
        `)
        .eq('id', selectedTask)
        .single();

      // إرسال إشعار واتساب للموظف الجديد
      const employeePhone = employeeData?.phone;
      if (employeePhone && orderData) {
        // جلب قالب رسالة نقل المهمة
        const { data: templateData } = await supabase
          .from('message_templates')
          .select('content')
          .eq('name', 'task_transfer')
          .eq('is_active', true)
          .single();

        let messageContent = '';
        
        if (templateData?.content) {
          // استخدام القالب مع استبدال المتغيرات
          messageContent = templateData.content
            .replace('{{employee_name}}', employeeData.full_name || 'الموظف')
            .replace('{{order_number}}', orderData.order_number)
            .replace('{{customer_name}}', orderData.customers?.name || 'غير محدد')
            .replace('{{delivery_date}}', new Date(orderData.delivery_date).toLocaleDateString('ar-SA'))
            .replace('{{transferred_by}}', currentEmployeeData?.full_name || 'المدير');
        } else {
          // رسالة افتراضية في حال عدم وجود قالب
          messageContent = `📋 تم تعيين مهمة جديدة لك\n\n` +
            `🔢 رقم الطلب: ${orderData.order_number}\n` +
            `👤 العميل: ${orderData.customers?.name || 'غير محدد'}\n` +
            `📅 تاريخ التسليم: ${new Date(orderData.delivery_date).toLocaleDateString('ar-SA')}\n` +
            `📤 تم النقل بواسطة: ${currentEmployeeData?.full_name || 'المدير'}\n\n` +
            `يرجى متابعة الطلب وإنجازه في الوقت المحدد.`;
        }

        const normalizedPhone = employeePhone.startsWith('+')
          ? employeePhone
          : (employeePhone.startsWith('966')
              ? `+${employeePhone}`
              : employeePhone.replace(/^0/, '+966'));

        const { data: insertedMessage, error: insertError } = await supabase
          .from('whatsapp_messages')
          .insert({
            to_number: normalizedPhone,
            message_type: 'task_transfer',
            message_content: messageContent,
            status: 'pending',
            is_reply: false,
          })
          .select()
          .single();

        if (insertError) {
          console.error('خطأ في إدراج رسالة الواتساب:', insertError);
        } else if (insertedMessage) {
          console.log('✅ تم إدراج رسالة واتساب:', insertedMessage.id);
          
          // معالجة الرسالة فوراً عبر process-whatsapp-queue
          try {
            const { data: queueData, error: queueError } = await supabase.functions.invoke(
              'process-whatsapp-queue',
              {
                body: {
                  source: 'task_transfer',
                  message_id: insertedMessage.id
                }
              }
            );

            if (queueError) {
              console.error('خطأ في معالجة طابور الواتساب:', queueError);
            } else {
              console.log('✅ تم معالجة رسالة الواتساب بنجاح:', queueData);
            }
          } catch (queueErr) {
            console.error('خطأ في استدعاء معالج الواتساب:', queueErr);
          }
        }
      }

      toast({
        title: 'تم نقل المهمة بنجاح',
        description: `تم نقل المهمة إلى ${employeeData?.full_name || 'الموظف المحدد'} وإرسال إشعار واتساب`,
      });

      setTransferDialogOpen(false);
      setSelectedTask(null);
      setSelectedEmployee('');
      fetchDailyTasks();
    } catch (error: any) {
      console.error('Error transferring task:', error);
      toast({
        title: 'خطأ في نقل المهمة',
        description: error?.message || 'تعذر نقل المهمة',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    document.title = 'المهام اليومية | لوحة الموظف';
    fetchDailyTasks();
    fetchEmployees();

    // الاشتراك في التحديثات الفورية
    const channel = supabase
      .channel('daily-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchDailyTasks();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_tasks',
        },
        () => {
          fetchDailyTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'قيد الانتظار', variant: 'outline' },
      in_progress: { label: 'جاري التنفيذ', variant: 'secondary' },
      ready_for_delivery: { label: 'جاهز للتسليم', variant: 'default' },
      completed: { label: 'مكتمل', variant: 'default' },
      cancelled: { label: 'ملغي', variant: 'destructive' },
    };

    const statusInfo = statusMap[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <main role="main" aria-label="المهام اليومية" className="space-y-6">
      {/* نظام التحذير التلقائي للطلبات */}
      <OrderDeliveryAlert />
      
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">المهام اليومية والمتأخرة</h1>
          <p className="text-muted-foreground mt-2">
            الطلبات المطلوب تسليمها اليوم وما قبله {new Date().toLocaleDateString('ar-SA', { timeZone: 'Asia/Riyadh' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة مهمة خاصة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>إضافة مهمة خاصة جديدة</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">العنوان *</Label>
                  <Input
                    id="title"
                    value={taskFormData.title}
                    onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                    placeholder="عنوان المهمة"
                    maxLength={200}
                  />
                </div>
                <div>
                  <Label htmlFor="description">الوصف</Label>
                  <Textarea
                    id="description"
                    value={taskFormData.description}
                    onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                    placeholder="وصف المهمة (اختياري)"
                    rows={3}
                    maxLength={500}
                  />
                </div>
                <div>
                  <Label htmlFor="task_type">نوع المهمة</Label>
                  <Select
                    value={taskFormData.task_type}
                    onValueChange={(value: any) => setTaskFormData({ ...taskFormData, task_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="follow_up">متابعة</SelectItem>
                      <SelectItem value="delivery">تسليم</SelectItem>
                      <SelectItem value="collection">تحصيل</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="task_date">تاريخ الإنجاز *</Label>
                    <Input
                      id="task_date"
                      type="date"
                      value={taskFormData.task_date}
                      onChange={(e) => setTaskFormData({ ...taskFormData, task_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="task_time">وقت الإنجاز</Label>
                    <Input
                      id="task_time"
                      type="time"
                      value={taskFormData.task_time}
                      onChange={(e) => setTaskFormData({ ...taskFormData, task_time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddTaskDialogOpen(false)}>
                    إلغاء
                  </Button>
                  <Button onClick={handleAddPersonalTask}>
                    حفظ
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button
            onClick={handleSendTestNotification}
            disabled={sendingTest}
            variant="outline"
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {sendingTest ? 'جاري الإرسال...' : 'إرسال إشعار اختبار'}
          </Button>
        </div>
      </header>

      <Separator />

      {/* تنبيهات الطلبات القادمة خلال ساعتين */}
      {tasks.filter(task => {
        if (task.is_manual || !task.delivery_date) return false;
        const deliveryDateTime = new Date(task.delivery_date);
        if (task.estimated_delivery_time) {
          const [hours, minutes] = task.estimated_delivery_time.split(':').map(Number);
          deliveryDateTime.setHours(hours, minutes, 0, 0);
        } else {
          deliveryDateTime.setHours(17, 0, 0, 0);
        }
        const now = new Date();
        const diff = deliveryDateTime.getTime() - now.getTime();
        const isUrgent = diff > 0 && diff <= 2 * 60 * 60 * 1000;
        return isUrgent && task.status !== 'مكتمل' && task.status !== 'ملغي';
      }).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-amber-700 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            تنبيهات التسليم القريبة (خلال ساعتين)
          </h3>
          {tasks.filter(task => {
            if (task.is_manual || !task.delivery_date) return false;
            const deliveryDateTime = new Date(task.delivery_date);
            if (task.estimated_delivery_time) {
              const [hours, minutes] = task.estimated_delivery_time.split(':').map(Number);
              deliveryDateTime.setHours(hours, minutes, 0, 0);
            } else {
              deliveryDateTime.setHours(17, 0, 0, 0);
            }
            const now = new Date();
            const diff = deliveryDateTime.getTime() - now.getTime();
            const isUrgent = diff > 0 && diff <= 2 * 60 * 60 * 1000;
            return isUrgent && task.status !== 'مكتمل' && task.status !== 'ملغي';
          }).map(task => (
            <DeliveryTimeIndicator
              key={task.id}
              deliveryDate={task.delivery_date!}
              deliveryTime={task.estimated_delivery_time}
              orderNumber={task.order_number || ''}
            />
          ))}
        </div>
      )}

      {/* إحصائيات الإنجاز */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المهام</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">طلبات اليوم</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المنجزة</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">طلب مكتمل</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل الإنجاز</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground">من إجمالي المهام</p>
          </CardContent>
        </Card>
      </div>

      {/* المهام الخاصة */}
      {personalTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>المهام الخاصة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العنوان</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الوقت</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {personalTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div className="font-medium">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-muted-foreground mt-1">{task.description}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.task_type === 'follow_up' ? 'متابعة' :
                         task.task_type === 'delivery' ? 'تسليم' :
                         task.task_type === 'collection' ? 'تحصيل' : 'أخرى'}
                      </TableCell>
                      <TableCell>{task.task_date}</TableCell>
                      <TableCell>{task.task_time || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          task.status === 'completed' ? 'default' :
                          task.status === 'in_progress' ? 'secondary' :
                          task.status === 'cancelled' ? 'destructive' : 'outline'
                        }>
                          {task.status === 'pending' ? 'قيد الانتظار' :
                           task.status === 'in_progress' ? 'جارِ التنفيذ' :
                           task.status === 'completed' ? 'مكتملة' : 'ملغاة'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingTask(task);
                            setIsEditTaskDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* جدول المهام اليومية (الطلبات) */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المهام اليومية (الطلبات)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التفاصيل</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>نوع الخدمة</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>وقت التسليم والوقت المتبقي</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      جارِ التحميل...
                    </TableCell>
                  </TableRow>
                ) : tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      لا توجد مهام غير منجزة
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <span className="font-medium">{task.order_number}</span>
                          <div className="text-xs text-muted-foreground">
                            بواسطة: {task.assigned_to}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{task.customer_name}</TableCell>
                      <TableCell>{task.service_type}</TableCell>
                      <TableCell>{`${task.total_amount?.toFixed(2)} ر.س`}</TableCell>
                      <TableCell>
                        {getStatusBadge(task.status!)}
                      </TableCell>
                      <TableCell>
                        {task.delivery_date && (
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {new Date(task.delivery_date).toLocaleDateString('ar-SA')}
                              {task.estimated_delivery_time && (
                                <span className="mr-2">الساعة {task.estimated_delivery_time}</span>
                              )}
                            </div>
                            <DeliveryTimeIndicator
                              deliveryDate={task.delivery_date}
                              deliveryTime={task.estimated_delivery_time}
                              orderNumber={task.order_number || ''}
                              compact={true}
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Dialog open={transferDialogOpen && selectedTask === task.id} onOpenChange={(open) => {
                          setTransferDialogOpen(open);
                          if (!open) {
                            setSelectedTask(null);
                            setSelectedEmployee('');
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTask(task.id);
                                setTransferDialogOpen(true);
                              }}
                            >
                              <UserPlus className="h-4 w-4 ml-2" />
                              نقل المهمة
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>نقل المهمة إلى موظف آخر</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">اختر الموظف</label>
                                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="اختر موظف..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {employees.map((emp) => (
                                      <SelectItem key={emp.id} value={emp.id}>
                                        {emp.full_name || emp.email}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setTransferDialogOpen(false);
                                    setSelectedTask(null);
                                    setSelectedEmployee('');
                                  }}
                                >
                                  إلغاء
                                </Button>
                                <Button onClick={handleTransferTask}>
                                  نقل المهمة
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* دايلوج تعديل حالة المهمة الخاصة */}
      <Dialog open={isEditTaskDialogOpen} onOpenChange={setIsEditTaskDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تحديث حالة المهمة</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4">
              <div>
                <Label>العنوان</Label>
                <div className="p-2 bg-muted rounded text-sm">{editingTask.title}</div>
              </div>
              <div>
                <Label htmlFor="status">الحالة</Label>
                <Select
                  defaultValue={editingTask.status}
                  onValueChange={(value: any) => handleUpdateTaskStatus(editingTask.id, value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">قيد الانتظار</SelectItem>
                    <SelectItem value="in_progress">جارِ التنفيذ</SelectItem>
                    <SelectItem value="completed">مكتملة</SelectItem>
                    <SelectItem value="cancelled">ملغاة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default DailyTasks;