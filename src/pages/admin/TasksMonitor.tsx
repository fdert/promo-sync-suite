import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Clock, AlertCircle, TrendingUp, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface EmployeeTask {
  employee_id: string;
  employee_name: string;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  completion_rate: number;
}

interface DailyStats {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  completion_rate: number;
  total_employees: number;
}

const TasksMonitor = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [employeeTasks, setEmployeeTasks] = useState<EmployeeTask[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    total_tasks: 0,
    completed_tasks: 0,
    pending_tasks: 0,
    completion_rate: 0,
    total_employees: 0,
  });

  const fetchTasksData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // جلب بيانات المهام اليومية لكل موظف
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, status, created_by')
        .eq('delivery_date', today);

      if (ordersError) throw ordersError;

      // جلب بيانات الموظفين
      const employeeIds = [...new Set(ordersData?.map((o: any) => o.created_by).filter(Boolean))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', employeeIds);

      // إنشاء خريطة للموظفين
      const profilesMap = new Map(profilesData?.map((p: any) => [p.id, p.full_name]) || []);

      // تجميع البيانات حسب الموظف
      const employeeMap = new Map<string, EmployeeTask>();
      
      ordersData?.forEach((order: any) => {
        const employeeId = order.created_by;
        const employeeName = profilesMap.get(employeeId) || 'غير محدد';
        const isCompleted = order.status === 'completed' || order.status === 'ready_for_delivery';

        if (!employeeMap.has(employeeId)) {
          employeeMap.set(employeeId, {
            employee_id: employeeId,
            employee_name: employeeName,
            total_tasks: 0,
            completed_tasks: 0,
            pending_tasks: 0,
            completion_rate: 0,
          });
        }

        const employee = employeeMap.get(employeeId)!;
        employee.total_tasks++;
        if (isCompleted) {
          employee.completed_tasks++;
        } else {
          employee.pending_tasks++;
        }
      });

      // حساب معدل الإنجاز لكل موظف
      const employeeTasksArray = Array.from(employeeMap.values()).map(emp => ({
        ...emp,
        completion_rate: emp.total_tasks > 0 
          ? Math.round((emp.completed_tasks / emp.total_tasks) * 100) 
          : 0,
      }));

      setEmployeeTasks(employeeTasksArray);

      // حساب الإحصائيات العامة
      const totalTasks = employeeTasksArray.reduce((sum, emp) => sum + emp.total_tasks, 0);
      const completedTasks = employeeTasksArray.reduce((sum, emp) => sum + emp.completed_tasks, 0);
      const pendingTasks = employeeTasksArray.reduce((sum, emp) => sum + emp.pending_tasks, 0);

      setDailyStats({
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        pending_tasks: pendingTasks,
        completion_rate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        total_employees: employeeTasksArray.length,
      });

    } catch (error: any) {
      console.error('Error loading tasks data:', error);
      toast({
        title: 'خطأ في تحميل البيانات',
        description: error?.message || 'تعذر جلب بيانات المهام',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'متابعة المهام اليومية | لوحة الإدارة';
    fetchTasksData();

    // الاشتراك في التحديثات الفورية
    const channel = supabase
      .channel('tasks-monitor-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchTasksData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 80) return <Badge className="bg-green-600">ممتاز</Badge>;
    if (rate >= 60) return <Badge className="bg-blue-600">جيد</Badge>;
    if (rate >= 40) return <Badge className="bg-yellow-600">متوسط</Badge>;
    return <Badge variant="destructive">ضعيف</Badge>;
  };

  return (
    <main role="main" aria-label="متابعة المهام اليومية" className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">متابعة المهام اليومية</h1>
        <p className="text-muted-foreground mt-2">
          تقرير إنجاز المهام ليوم {new Date().toLocaleDateString('ar-SA')}
        </p>
      </header>

      <Separator />

      {/* الإحصائيات العامة */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المهام</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyStats.total_tasks}</div>
            <p className="text-xs text-muted-foreground">مهمة اليوم</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المنجزة</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dailyStats.completed_tasks}</div>
            <p className="text-xs text-muted-foreground">مهمة مكتملة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد التنفيذ</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{dailyStats.pending_tasks}</div>
            <p className="text-xs text-muted-foreground">مهمة متبقية</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل الإنجاز</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyStats.completion_rate}%</div>
            <Progress value={dailyStats.completion_rate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الموظفون</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyStats.total_employees}</div>
            <p className="text-xs text-muted-foreground">موظف نشط</p>
          </CardContent>
        </Card>
      </div>

      {/* تقرير أداء الموظفين */}
      <Card>
        <CardHeader>
          <CardTitle>تقرير أداء الموظفين</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم الموظف</TableHead>
                  <TableHead>إجمالي المهام</TableHead>
                  <TableHead>المنجزة</TableHead>
                  <TableHead>قيد التنفيذ</TableHead>
                  <TableHead>معدل الإنجاز</TableHead>
                  <TableHead>التقييم</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      جارِ التحميل...
                    </TableCell>
                  </TableRow>
                ) : employeeTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      لا توجد مهام لليوم
                    </TableCell>
                  </TableRow>
                ) : (
                  employeeTasks
                    .sort((a, b) => b.completion_rate - a.completion_rate)
                    .map((employee) => (
                      <TableRow key={employee.employee_id}>
                        <TableCell className="font-medium">{employee.employee_name}</TableCell>
                        <TableCell>{employee.total_tasks}</TableCell>
                        <TableCell className="text-green-600 font-semibold">
                          {employee.completed_tasks}
                        </TableCell>
                        <TableCell className="text-orange-600">
                          {employee.pending_tasks}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{employee.completion_rate}%</span>
                            <Progress value={employee.completion_rate} className="w-20" />
                          </div>
                        </TableCell>
                        <TableCell>{getPerformanceBadge(employee.completion_rate)}</TableCell>
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

export default TasksMonitor;
