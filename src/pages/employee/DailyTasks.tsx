import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface DailyTask {
  id: string;
  order_number: string;
  customer_name: string;
  service_type: string;
  status: string;
  delivery_date: string;
  total_amount: number;
  created_at: string;
}

const DailyTasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
  });

  const fetchDailyTasks = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
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
        .eq('delivery_date', today)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTasks = data?.map((order: any) => ({
        id: order.id,
        order_number: order.order_number || 'غير محدد',
        customer_name: order.customers?.name || 'غير محدد',
        service_type: order.service_types?.name || 'غير محدد',
        status: order.status,
        delivery_date: order.delivery_date,
        total_amount: order.total_amount || 0,
        created_at: order.created_at,
      })) || [];

      setTasks(formattedTasks);

      // حساب الإحصائيات
      const completed = formattedTasks.filter(
        t => t.status === 'completed' || t.status === 'ready_for_delivery'
      ).length;
      const pending = formattedTasks.filter(
        t => t.status !== 'completed' && t.status !== 'ready_for_delivery'
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

  useEffect(() => {
    document.title = 'المهام اليومية | لوحة الموظف';
    fetchDailyTasks();

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
          الطلبات المطلوب تسليمها اليوم {new Date().toLocaleDateString('ar-SA')}
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
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تاريخ التسليم</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      جارِ التحميل...
                    </TableCell>
                  </TableRow>
                ) : tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      لا توجد مهام مطلوب تسليمها اليوم
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.order_number}</TableCell>
                      <TableCell>{task.customer_name}</TableCell>
                      <TableCell>{task.service_type}</TableCell>
                      <TableCell>{task.total_amount.toFixed(2)} ر.س</TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      <TableCell>
                        {new Date(task.delivery_date).toLocaleDateString('ar-SA')}
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
