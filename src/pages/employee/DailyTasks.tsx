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
import { CheckCircle2, Clock, AlertCircle, UserPlus } from 'lucide-react';

interface DailyTask {
  id: string;
  order_number: string;
  customer_name: string;
  service_type: string;
  status: string;
  delivery_date: string;
  total_amount: number;
  created_at: string;
  created_by: string;
  assigned_to?: string;
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
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
  });

  const fetchDailyTasks = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date());
      
      // جلب طلبات الموظف: طلبات اليوم غير المنجزة + الطلبات المتأخرة قيد التنفيذ
      const { data, error } = await supabase
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
        .or(`and(delivery_date.eq.${today},status.neq.مكتمل,status.neq.جاهز للتسليم),and(delivery_date.lt.${today},status.eq.قيد التنفيذ)`)
        .order('delivery_date', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

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

      const formattedTasks = (data || []).map((order: any) => ({
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
      }));

      setTasks(formattedTasks);

      // حساب الإحصائيات
      const completed = formattedTasks.filter(
        t => t.status === 'مكتمل' || t.status === 'جاهز للتسليم'
      ).length;
      const pending = formattedTasks.filter(
        t => t.status !== 'مكتمل' && t.status !== 'جاهز للتسليم'
      ).length;

      setStats({
        total: formattedTasks.length,
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
      <header>
        <h1 className="text-3xl font-bold">المهام اليومية</h1>
        <p className="text-muted-foreground mt-2">
          الطلبات المطلوب تسليمها اليوم {new Date().toLocaleDateString('ar-SA', { timeZone: 'Asia/Riyadh' })}
        </p>
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
                  <TableHead>رقم الطلب</TableHead>
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
                    <TableCell colSpan={9} className="text-center">
                      جارِ التحميل...
                    </TableCell>
                  </TableRow>
                ) : tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      لا توجد مهام مطلوب تسليمها اليوم
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.order_number}</TableCell>
                      <TableCell>{task.customer_name}</TableCell>
                      <TableCell>{task.service_type}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{task.assigned_to}</Badge>
                      </TableCell>
                      <TableCell>{task.total_amount.toFixed(2)} ر.س</TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      <TableCell>
                        {task.status === 'مكتمل' || task.status === 'جاهز للتسليم' ? (
                          <Badge variant="default" className="bg-green-600">✓ تم الإنجاز</Badge>
                        ) : (
                          <Badge variant="destructive">✗ لم ينجز</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(task.delivery_date).toLocaleDateString('ar-SA')}
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
    </main>
  );
};

export default DailyTasks;
