import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Clock, AlertCircle, TrendingUp, Users, Eye, FileDown } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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

interface OrderTask {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
  total_amount: number;
  created_at: string;
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
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeTask | null>(null);
  const [employeeOrders, setEmployeeOrders] = useState<OrderTask[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const fetchTasksData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // جلب جميع الموظفين النشطين (الذين لديهم دور employee أو admin)
      const { data: allEmployees, error: employeesError } = await supabase
        .from('profiles')
        .select('id, full_name, status')
        .eq('status', 'active');

      if (employeesError) throw employeesError;

      // جلب المهام المستحقة اليوم أو المتأخرة (حالات محددة فقط)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, status, created_by, delivery_date')
        .lte('delivery_date', today)
        .in('status', ['قيد التنفيذ', 'in_progress', 'جديد', 'pending', 'قيد الانتظار']);

      if (ordersError) throw ordersError;

      // IDs الموظفين المستثنيين من التقرير
      const excludedEmployeeIds = [
        '3b2c81e5-c10e-4bba-a092-e00578901cdb', // عبدالمحسن
        '258e4ba8-ff49-4517-8772-db75277e871b', // غير محدد
      ];

      // إنشاء خريطة للموظفين - تهيئة جميع الموظفين بصفر مهام (مع استثناء الموظفين المحددين)
      const employeeMap = new Map<string, EmployeeTask>();
      
      allEmployees?.forEach((employee: any) => {
        // تخطي الموظفين المستثنيين
        if (excludedEmployeeIds.includes(employee.id)) return;
        
        // تخطي الموظفين بدون اسم أو اسم "غير محدد"
        if (!employee.full_name || employee.full_name.trim() === '' || employee.full_name === 'غير محدد') return;
        
        employeeMap.set(employee.id, {
          employee_id: employee.id,
          employee_name: employee.full_name,
          total_tasks: 0,
          completed_tasks: 0,
          pending_tasks: 0,
          completion_rate: 0,
        });
      });

      // إضافة بيانات المهام للموظفين - الحالات المطلوبة فقط
      ordersData?.forEach((order: any) => {
        const employeeId = order.created_by;
        if (!employeeId || !employeeMap.has(employeeId)) return;

        const employee = employeeMap.get(employeeId)!;
        employee.total_tasks++;
        
        // جميع المهام المجلوبة هي قيد التنفيذ (لم تكتمل بعد)
        employee.pending_tasks++;
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
    document.title = 'متابعة المهام المتأخرة والمستحقة | لوحة الإدارة';
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

  const fetchEmployeeOrders = async (employeeId: string, employeeName: string) => {
    try {
      setLoadingOrders(true);
      const today = new Date().toISOString().split('T')[0];

      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total_amount,
          created_at,
          delivery_date,
          customers (name)
        `)
        .lte('delivery_date', today)
        .eq('created_by', employeeId)
        .in('status', ['قيد التنفيذ', 'in_progress', 'جديد', 'pending', 'قيد الانتظار'])
        .order('delivery_date', { ascending: true });

      if (error) throw error;

      const formattedOrders: OrderTask[] = ordersData?.map((order: any) => ({
        id: order.id,
        order_number: order.order_number || 'غير محدد',
        customer_name: order.customers?.name || 'غير محدد',
        status: order.status,
        total_amount: order.total_amount || 0,
        created_at: order.delivery_date || order.created_at, // استخدام delivery_date للعرض
      })) || [];

      setEmployeeOrders(formattedOrders);
    } catch (error: any) {
      console.error('Error loading employee orders:', error);
      toast({
        title: 'خطأ',
        description: 'تعذر جلب تفاصيل مهام الموظف',
        variant: 'destructive',
      });
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleEmployeeClick = (employee: EmployeeTask) => {
    setSelectedEmployee(employee);
    fetchEmployeeOrders(employee.employee_id, employee.employee_name);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'مكتمل':
        return <Badge className="bg-green-600">مكتمل</Badge>;
      case 'delivered':
      case 'تم التسليم':
        return <Badge className="bg-green-700">تم التسليم</Badge>;
      case 'ready_for_delivery':
      case 'جاهز للتسليم':
        return <Badge className="bg-blue-600">جاهز للتسليم</Badge>;
      case 'in_progress':
      case 'قيد التنفيذ':
        return <Badge className="bg-yellow-600">قيد التنفيذ</Badge>;
      case 'pending':
      case 'قيد الانتظار':
        return <Badge className="bg-orange-500">قيد الانتظار</Badge>;
      case 'new':
      case 'جديد':
        return <Badge className="bg-sky-600">جديد</Badge>;
      case 'cancelled':
      case 'ملغي':
        return <Badge variant="destructive">ملغي</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 80) return <Badge className="bg-green-600">ممتاز</Badge>;
    if (rate >= 60) return <Badge className="bg-blue-600">جيد</Badge>;
    if (rate >= 40) return <Badge className="bg-yellow-600">متوسط</Badge>;
    return <Badge variant="destructive">ضعيف</Badge>;
  };

  const exportToPDF = async () => {
    try {
      toast({
        title: 'جاري إنشاء التقرير...',
        description: 'يرجى الانتظار',
      });

      const now = new Date();
      const today = now.toISOString().split('T')[0];

      // جلب بيانات الطلبات التفصيلية
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          created_at,
          delivery_date,
          status,
          customers (name),
          order_items (
            item_name,
            quantity,
            unit_price,
            total
          )
        `)
        .lte('delivery_date', today)
        .in('status', ['قيد التنفيذ', 'in_progress', 'جديد', 'pending', 'قيد الانتظار'])
        .order('delivery_date', { ascending: true });

      if (ordersError) throw ordersError;

      // إنشاء عنصر HTML للتقرير
      const reportElement = document.createElement('div');
      reportElement.style.width = '210mm';
      reportElement.style.padding = '20mm';
      reportElement.style.fontFamily = 'Arial, sans-serif';
      reportElement.style.direction = 'rtl';
      reportElement.style.backgroundColor = 'white';
      reportElement.style.color = 'black';

      const dateStr = now.toLocaleDateString('ar-SA', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const timeStr = now.toLocaleTimeString('ar-SA', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      let htmlContent = `
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #4A90E2; padding-bottom: 20px;">
          <h1 style="color: #2c3e50; font-size: 28px; margin-bottom: 10px;">📊 تقرير المهام اليومية</h1>
          <p style="color: #7f8c8d; font-size: 16px;">${dateStr} - ${timeStr}</p>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #2c3e50; font-size: 22px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #ecf0f1;">الإحصائيات العامة</h2>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center;">
              <h3 style="font-size: 14px; margin-bottom: 10px; opacity: 0.9;">إجمالي طلبات اليوم</h3>
              <div style="font-size: 36px; font-weight: bold;">${dailyStats.total_tasks}</div>
            </div>
            <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 20px; border-radius: 8px; text-align: center;">
              <h3 style="font-size: 14px; margin-bottom: 10px; opacity: 0.9;">الطلبات المنجزة</h3>
              <div style="font-size: 36px; font-weight: bold;">${dailyStats.completed_tasks}</div>
            </div>
            <div style="background: linear-gradient(135deg, #ee0979 0%, #ff6a00 100%); color: white; padding: 20px; border-radius: 8px; text-align: center;">
              <h3 style="font-size: 14px; margin-bottom: 10px; opacity: 0.9;">الطلبات قيد التنفيذ</h3>
              <div style="font-size: 36px; font-weight: bold;">${dailyStats.pending_tasks}</div>
            </div>
          </div>
        </div>

        <div style="margin-top: 30px;">
          <h2 style="color: #2c3e50; font-size: 22px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #ecf0f1;">📋 تفاصيل الطلبات</h2>
      `;

      if (ordersData && ordersData.length > 0) {
        ordersData.forEach((order: any, index: number) => {
          const customerName = order.customers?.name || 'غير محدد';
          const deliveryDate = new Date(order.delivery_date);
          const createdDate = new Date(order.created_at);
          const delayDays = Math.max(0, Math.floor((now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24)));

          htmlContent += `
            <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px; page-break-inside: avoid;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 2px solid #dee2e6;">
                <div style="font-size: 20px; font-weight: bold; color: #4A90E2;">طلب رقم: ${order.order_number}</div>
                <div style="background: ${delayDays > 0 ? '#dc3545' : '#28a745'}; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold;">
                  ${delayDays > 0 ? `متأخر ${delayDays} يوم` : 'في الوقت المحدد'}
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px;">
                <div>
                  <span style="font-size: 12px; color: #6c757d; display: block; margin-bottom: 5px;">اسم العميل</span>
                  <span style="font-size: 15px; color: #2c3e50; font-weight: 600;">${customerName}</span>
                </div>
                <div>
                  <span style="font-size: 12px; color: #6c757d; display: block; margin-bottom: 5px;">تاريخ الإنشاء</span>
                  <span style="font-size: 15px; color: #2c3e50; font-weight: 600;">${createdDate.toLocaleDateString('ar-SA')}</span>
                </div>
                <div>
                  <span style="font-size: 12px; color: #6c757d; display: block; margin-bottom: 5px;">وقت التسجيل</span>
                  <span style="font-size: 15px; color: #2c3e50; font-weight: 600;">${createdDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div>
                  <span style="font-size: 12px; color: #6c757d; display: block; margin-bottom: 5px;">تاريخ التسليم</span>
                  <span style="font-size: 15px; color: #2c3e50; font-weight: 600;">${deliveryDate.toLocaleDateString('ar-SA')}</span>
                </div>
              </div>
          `;

          if (order.order_items && order.order_items.length > 0) {
            htmlContent += `
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <thead>
                  <tr style="background: #e9ecef;">
                    <th style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057;">البند</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057;">الكمية</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057;">سعر الوحدة</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057;">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
            `;

            order.order_items.forEach((item: any) => {
              htmlContent += `
                <tr>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6;">${item.item_name}</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6;">${item.quantity}</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6;">${item.unit_price.toFixed(2)} ر.س</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6;">${item.total.toFixed(2)} ر.س</td>
                </tr>
              `;
            });

            htmlContent += `
                  <tr style="background: #f1f3f5; font-weight: bold;">
                    <td colspan="3" style="padding: 10px; text-align: right;">إجمالي تكلفة الطلب</td>
                    <td style="padding: 10px; text-align: right;">${order.total_amount.toFixed(2)} ر.س</td>
                  </tr>
                </tbody>
              </table>
            `;
          }

          htmlContent += `</div>`;
        });
      } else {
        htmlContent += `<p style="text-align: center; color: #6c757d; padding: 40px;">لا توجد طلبات لعرضها</p>`;
      }

      htmlContent += `</div>`;
      reportElement.innerHTML = htmlContent;
      document.body.appendChild(reportElement);

      // تحويل HTML إلى صورة باستخدام html2canvas
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      document.body.removeChild(reportElement);

      // إنشاء PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `تقرير_المهام_اليومية_${today}_${now.getHours()}-${now.getMinutes()}.pdf`;
      pdf.save(fileName);

      toast({
        title: 'تم التصدير بنجاح',
        description: 'تم تصدير التقرير بصيغة PDF',
      });
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'خطأ في التصدير',
        description: error?.message || 'تعذر تصدير التقرير',
        variant: 'destructive',
      });
    }
  };

  return (
    <main role="main" aria-label="متابعة المهام اليومية" className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">متابعة المهام المتأخرة والمستحقة</h1>
          <p className="text-muted-foreground mt-2">
            تقرير المهام المستحقة اليوم والمتأخرة عن التسليم - {new Date().toLocaleDateString('ar-SA')}
          </p>
        </div>
        <Button 
          onClick={exportToPDF} 
          variant="default"
          className="gap-2"
          disabled={loading}
        >
          <FileDown className="h-4 w-4" />
          تصدير PDF
        </Button>
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
            <p className="text-xs text-muted-foreground">مهمة متأخرة ومستحقة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد التنفيذ</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{dailyStats.pending_tasks}</div>
            <p className="text-xs text-muted-foreground">مهمة تحتاج تسليم</p>
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

      {/* تقرير المهام المتأخرة والمستحقة */}
      <Card>
        <CardHeader>
          <CardTitle>تقرير المهام المتأخرة والمستحقة حسب الموظف</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم الموظف</TableHead>
                  <TableHead>إجمالي المهام</TableHead>
                  <TableHead>قيد التنفيذ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      جارِ التحميل...
                    </TableCell>
                  </TableRow>
                ) : employeeTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      لا توجد مهام متأخرة أو مستحقة
                    </TableCell>
                  </TableRow>
                ) : (
                  employeeTasks
                    .sort((a, b) => b.total_tasks - a.total_tasks)
                    .map((employee) => (
                      <TableRow key={employee.employee_id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <Button
                            variant="link"
                            className="p-0 h-auto font-medium text-primary hover:underline"
                            onClick={() => handleEmployeeClick(employee)}
                          >
                            {employee.employee_name}
                          </Button>
                        </TableCell>
                        <TableCell>{employee.total_tasks}</TableCell>
                        <TableCell className="text-orange-600">
                          {employee.pending_tasks}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog تفاصيل مهام الموظف */}
      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              تفاصيل مهام: {selectedEmployee?.employee_name}
            </DialogTitle>
            <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
              <span>إجمالي المهام: {selectedEmployee?.total_tasks}</span>
              <span className="text-orange-600">قيد التنفيذ: {selectedEmployee?.pending_tasks}</span>
            </div>
          </DialogHeader>

          <div className="mt-4">
            {loadingOrders ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : employeeOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">لا توجد مهام</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>تاريخ التسليم</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>{order.total_amount.toFixed(2)} ريال</TableCell>
                      <TableCell>
                        {new Date(order.created_at).toLocaleDateString('ar-SA')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default TasksMonitor;
