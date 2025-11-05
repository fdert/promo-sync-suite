import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<EmployeeTask | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'other' as 'follow_up' | 'delivery' | 'collection' | 'other',
    task_date: new Date().toISOString().split('T')[0],
    task_time: '',
  });

  const fetchTasks = async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      // محاولة جلب المهام مباشرة
      const { data, error } = await supabase
        .from('employee_tasks' as any)
        .select('*')
        .order('task_date', { ascending: true })
        .order('task_time', { ascending: true });

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

  const handleAddTask = async () => {
    if (!user || !formData.title || !formData.task_date) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء العنوان والتاريخ',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('employee_tasks' as any)
        .insert([{
          title: formData.title,
          description: formData.description || null,
          task_type: formData.task_type,
          task_date: formData.task_date,
          task_time: formData.task_time || null,
          created_by: user.id,
          assigned_to: user.id,
          status: 'pending',
          order_id: null,
        }]);

      if (error) throw error;

      toast({
        title: 'تم إضافة المهمة',
        description: 'تم إضافة المهمة بنجاح',
      });

      setIsAddDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        task_type: 'other',
        task_date: new Date().toISOString().split('T')[0],
        task_time: '',
      });
      fetchTasks();
    } catch (error: any) {
      console.error('Error adding task:', error);
      toast({
        title: 'خطأ في إضافة المهمة',
        description: error?.message ?? 'تعذر إضافة المهمة',
        variant: 'destructive',
      });
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

      fetchTasks();
      setIsEditDialogOpen(false);
      setEditingTask(null);
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({
        title: 'خطأ في التحديث',
        description: error?.message ?? 'تعذر تحديث المهمة',
        variant: 'destructive',
      });
    }
  };

  const canEditTask = (task: EmployeeTask) => {
    return task.created_by === user?.id && !task.order_id;
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  return (
    <main role="main" aria-label="قائمة مهام الموظف" className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">المهام</h1>
        <div className="flex items-center gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="ml-2 h-4 w-4" />
                إضافة مهمة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>إضافة مهمة جديدة</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">العنوان *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="عنوان المهمة"
                  />
                </div>
                <div>
                  <Label htmlFor="description">الوصف</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="وصف المهمة"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="task_type">نوع المهمة</Label>
                  <Select
                    value={formData.task_type}
                    onValueChange={(value: any) => setFormData({ ...formData, task_type: value })}
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
                      value={formData.task_date}
                      onChange={(e) => setFormData({ ...formData, task_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="task_time">وقت الإنجاز</Label>
                    <Input
                      id="task_time"
                      type="time"
                      value={formData.task_time}
                      onChange={(e) => setFormData({ ...formData, task_time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    إلغاء
                  </Button>
                  <Button onClick={handleAddTask}>
                    حفظ
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
                  <TableHead>الوقت</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>جارِ التحميل...</TableCell>
                  </TableRow>
                ) : tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>لا توجد مهام حالياً</TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">
                        {task.title}
                        {task.description && (
                          <div className="text-xs text-muted-foreground mt-1">{task.description}</div>
                        )}
                      </TableCell>
                      <TableCell>{
                        task.task_type === 'follow_up' ? 'متابعة' :
                        task.task_type === 'delivery' ? 'تسليم' :
                        task.task_type === 'collection' ? 'تحصيل' : 'أخرى'
                      }</TableCell>
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
                      <TableCell>{task.order_id ? task.order_id.slice(0, 8) + '…' : '-'}</TableCell>
                      <TableCell>
                        {canEditTask(task) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingTask(task);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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

export default EmployeeTasks;
