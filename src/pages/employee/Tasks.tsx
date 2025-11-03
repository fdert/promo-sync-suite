import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface EmployeeTask {
  id: string;
  title: string;
  description?: string | null;
  task_type: 'follow_up' | 'delivery' | 'collection' | 'other';
  task_date: string;
  task_time?: string | null;
  assigned_to?: string | null;
  created_by?: string | null;
  order_id?: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completion_notes?: string | null;
  completed_at?: string | null;
  is_transferred?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

const EmployeeTasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);

  const fetchTasks = async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      // محاولة جلب المهام مباشرة
      const { data, error } = await supabase
        .from('employee_tasks' as any)
        .select('*')
        .order('task_date', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205') {
          toast({
            title: 'جدول المهام غير موجود',
            description: 'يرجى إنشاء جدول employee_tasks في SQL Editor أولاً',
            variant: 'destructive',
          });
          setTasks([]);
          return;
        }
        throw error;
      }
      
      setTasks(((data as unknown) as EmployeeTask[]) ?? []);
      
      if (!data || data.length === 0) {
        toast({
          title: 'لا توجد مهام',
          description: 'لم يتم العثور على أي مهام حالياً',
        });
      }
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      toast({
        title: 'خطأ في تحميل المهام',
        description: error?.message ?? 'تعذر جلب بيانات المهام',
        variant: 'destructive',
      });
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'المهام | لوحة الموظف';
  }, []);

  useEffect(() => {
    fetchTasks();
    // يمكن لاحقًا إضافة اشتراك فوري realtime
    // والاعتماد على supabase.channel(...)
  }, [user]);

  return (
    <main role="main" aria-label="قائمة مهام الموظف" className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">المهام</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={fetchTasks} disabled={loading}>
            تحديث
          </Button>
        </div>
      </header>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>قائمة المهام</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العنوان</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>رقم الطلب</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5}>جارِ التحميل...</TableCell>
                  </TableRow>
                ) : tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>لا توجد مهام حالياً</TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>{
                        task.task_type === 'follow_up' ? 'متابعة' :
                        task.task_type === 'delivery' ? 'تسليم' :
                        task.task_type === 'collection' ? 'تحصيل' : 'أخرى'
                      }</TableCell>
                      <TableCell>{task.task_date}</TableCell>
                      <TableCell>{
                        task.status === 'pending' ? 'قيد الانتظار' :
                        task.status === 'in_progress' ? 'جارِ التنفيذ' :
                        task.status === 'completed' ? 'مكتملة' : 'ملغاة'
                      }</TableCell>
                      <TableCell>{task.order_id ? task.order_id.slice(0, 8) + '…' : '-'}</TableCell>
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

export default EmployeeTasks;
