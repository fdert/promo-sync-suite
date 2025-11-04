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
import { CheckCircle2, Clock, AlertCircle, UserPlus, Send, Plus, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface DailyTask {
  id: string;
  order_number?: string;
  customer_name?: string;
  service_type?: string;
  status?: string;
  delivery_date?: string;
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

interface Employee {
  id: string;
  full_name: string;
  email: string;
  phone: string;
}

const DailyTasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
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
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: new Date().toISOString().split('T')[0],
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
      
      // جلب طلبات الموظف
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          delivery_date,
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

      if (ordersError) throw ordersError;

      // جلب المهام الشخصية للموظف
      const { data: employeeTasks, error: tasksError } = await supabase
        .from('employee_tasks')
        .select('*')
        .eq('employee_id', user.id)
        .eq('due_date', today);

      if (tasksError) {
        console.error('Error fetching employee tasks:', tasksError);
        // لا نوقف التنفيذ، نكمل بدون المهام الشخصية
      }

      console.log('📊 نتائج الجلب:', {
        ordersCount: ordersData?.length || 0,
        tasksCount: employeeTasks?.length || 0
      });

      // جلب أسماء المسؤولين (created_by) من جدول profiles
      const createdByIds = Array.from(
        new Set((ordersData || []).map((o: any) => o.created_by).filter(Boolean))
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

      // تنسيق الطلبات
      const formattedOrders: DailyTask[] = (ordersData || []).map((order: any) => ({
        id: order.id,
        order_number: order.order_number || 'غير محدد',
        customer_name: order.customers?.name || 'غير محدد',
        service_type: order.service_types?.name || 'غير محدد',
        status: order.status,
        delivery_date: order.delivery_date,
        total_amount: order.total_amount || 0,
        created_at: order.created_at,
        created_by: order.created_by,
        assigned_to: profilesMap[order.created_by] || 'غير محدد',
        is_manual: false,
      }));

      // تنسيق المهام الشخصية
      const formattedTasks: DailyTask[] = (employeeTasks || []).map((task: any) => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        due_date: task.due_date,
        is_completed: task.is_completed,
        is_manual: true,
        assigned_to: user.full_name || 'أنت',
      }));

      // دمج الطلبات والمهام الشخصية
      const allTasks = [...formattedOrders, ...formattedTasks];
      setTasks(allTasks);

      console.log('✅ المهام النهائية:', {
        total: allTasks.length,
        orders: formattedOrders.length,
        manualTasks: formattedTasks.length
      });

      // حساب الإحصائيات
      const completed = allTasks.filter(
        t => t.is_manual ? t.is_completed : (t.status === 'مكتمل' || t.status === 'جاهز للتسليم')
      ).length;
      const pending = allTasks.filter(
        t => t.is_manual ? !t.is_completed : (t.status !== 'مكتمل' && t.status !== 'جاهز للتسليم')
      ).length;

      setStats({
        total: allTasks.length,
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

  const handleAddTask = async () => {
    if (!newTask.title.trim() || !user?.id) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال عنوان المهمة',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('employee_tasks')
        .insert([
          {
            employee_id: user.id,
            title: newTask.title,
            description: newTask.description,
            due_date: newTask.due_date,
          }
        ]);

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: 'تم إضافة المهمة بنجاح',
      });

      setAddTaskDialogOpen(false);
      setNewTask({
        title: '',
        description: '',
        due_date: new Date().toISOString().split('T')[0],
      });
      fetchDailyTasks();
    } catch (error) {
      console.error('Error adding task:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في إضافة المهمة',
        variant: 'destructive',
      });
    }
  };

  const handleToggleTaskCompletion = async (taskId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('employee_tasks')
        .update({ 
          is_completed: !currentStatus,
          completed_at: !currentStatus ? new Date().toISOString() : null,
        })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'تم التحديث',
        description: !currentStatus ? 'تم وضع علامة على المهمة كمنجزة' : 'تم إلغاء علامة الإنجاز',
      });

      fetchDailyTasks();
    } catch (error) {
      console.error('Error toggling task:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في تحديث المهمة',
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

      const { error: updateError } = await supabase
        .from('orders')
        .update({ created_by: selectedEmployee })
        .eq('id', selectedTask);

      if (updateError) throw updateError;

      const { data: employeeData } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', selectedEmployee)
        .single();

      const { data: orderData } = await supabase
        .from('orders')
        .select(`
          order_number,
          delivery_date,
          customers (name)
        `)
        .eq('id', selectedTask)
        .single();

      const employeePhone = employeeData?.phone;
      if (employeePhone && orderData) {
        const { data: templateData } = await supabase
          .from('message_templates')
          .select('content')
          .eq('name', 'task_transfer')
          .eq('is_active', true)
          .single();

        let messageContent = '';
        
        if (templateData?.content) {
          messageContent = templateData.content
            .replace('{{employee_name}}', employeeData.full_name || 'الموظف')
            .replace('{{order_number}}', orderData.order_number)
            .replace('{{customer_name}}', orderData.customers?.name || 'غير محدد')
            .replace('{{delivery_date}}', new Date(orderData.delivery_date).toLocaleDateString('ar-SA'))
            .replace('{{transferred_by}}', currentEmployeeData?.full_name || 'المدير');
        } else {
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
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">المهام اليومية والمتأخرة</h1>
          <p className="text-muted-foreground mt-2">
            الطلبات المطلوب تسليمها اليوم وما قبله {new Date().toLocaleDateString('ar-SA', { timeZone: 'Asia/Riyadh' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setAddTaskDialogOpen(true)}
            variant="default"
          >
            <Plus className="ml-2 h-4 w-4" />
            إضافة مهمة شخصية
          </Button>
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

      {/* جدول المهام */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المهام اليومية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>النوع</TableHead>
                  <TableHead>التفاصيل</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>نوع الخدمة</TableHead>
                  <TableHead>المسؤول</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>حالة الإنجاز</TableHead>
                  <TableHead>تاريخ التسليم</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center">
                      جارِ التحميل...
                    </TableCell>
                  </TableRow>
                ) : tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center">
                      لا توجد مهام غير منجزة
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        {task.is_manual ? (
                          <Badge variant="secondary">مهمة شخصية</Badge>
                        ) : (
                          <Badge variant="outline">طلب</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.is_manual ? (
                          <div>
                            <div className="font-medium">{task.title}</div>
                            {task.description && (
                              <div className="text-sm text-muted-foreground">{task.description}</div>
                            )}
                          </div>
                        ) : (
                          <span className="font-medium">{task.order_number}</span>
                        )}
                      </TableCell>
                      <TableCell>{task.is_manual ? '-' : task.customer_name}</TableCell>
                      <TableCell>{task.is_manual ? '-' : task.service_type}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{task.assigned_to}</Badge>
                      </TableCell>
                      <TableCell>{task.is_manual ? '-' : `${task.total_amount?.toFixed(2)} ر.س`}</TableCell>
                      <TableCell>
                        {task.is_manual ? '-' : getStatusBadge(task.status!)}
                      </TableCell>
                      <TableCell>
                        {task.is_manual ? (
                          <Badge variant={task.is_completed ? 'default' : 'destructive'} className={task.is_completed ? 'bg-green-600' : ''}>
                            {task.is_completed ? '✓ تم الإنجاز' : '✗ لم ينجز'}
                          </Badge>
                        ) : (
                          <>
                            {task.status === 'مكتمل' || task.status === 'جاهز للتسليم' ? (
                              <Badge variant="default" className="bg-green-600">✓ تم الإنجاز</Badge>
                            ) : (
                              <Badge variant="destructive">✗ لم ينجز</Badge>
                            )}
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {new Date(task.is_manual ? task.due_date! : task.delivery_date!).toLocaleDateString('ar-SA')}
                          {!task.is_manual && task.delivery_date && task.delivery_date < todayDate && (
                            <Badge variant="destructive" className="text-xs">متأخر</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.is_manual ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleTaskCompletion(task.id, task.is_completed!)}
                          >
                            {task.is_completed ? (
                              <>
                                <X className="ml-1 h-4 w-4" />
                                إلغاء الإنجاز
                              </>
                            ) : (
                              <>
                                <Check className="ml-1 h-4 w-4" />
                                وضع علامة كمنجز
                              </>
                            )}
                          </Button>
                        ) : (
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
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog لإضافة مهمة شخصية */}
      <Dialog open={addTaskDialogOpen} onOpenChange={setAddTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة مهمة شخصية</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">عنوان المهمة *</Label>
              <Input
                id="title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="أدخل عنوان المهمة"
              />
            </div>
            <div>
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="أدخل وصف المهمة (اختياري)"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="due_date">تاريخ الإنجاز</Label>
              <Input
                id="due_date"
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddTaskDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleAddTask}>
                إضافة المهمة
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default DailyTasks;
