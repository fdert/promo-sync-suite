import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ReportData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  invoicesCount: number;
  expensesCount: number;
}

interface Expense {
  id: string;
  expense_number: string;
  description: string;
  amount: number;
  category: string;
  payment_method: string;
  date: string;
  notes?: string;
  created_at: string;
}

const Reports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [reportData, setReportData] = useState<ReportData>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    invoicesCount: 0,
    expensesCount: 0,
  });
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("this_month");
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    category: "",
    payment_method: "",
    date: new Date().toISOString().split('T')[0],
    notes: ""
  });

  useEffect(() => {
    setDateRangeFromPeriod(selectedPeriod);
  }, [selectedPeriod]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchReportData();
    }
  }, [startDate, endDate]);

  const setDateRangeFromPeriod = (period: string) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (period) {
      case "this_month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "last_month":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "this_year":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case "last_year":
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        return;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);

      // جلب الإيرادات من الفواتير
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('total_amount, status')
        .gte('issue_date', startDate)
        .lte('issue_date', endDate);

      if (invoicesError) throw invoicesError;

      // جلب المصروفات
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (expensesError) throw expensesError;

      const totalRevenue = invoicesData?.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0) || 0;
      const totalExpenses = expensesData?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;

      setReportData({
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        invoicesCount: invoicesData?.length || 0,
        expensesCount: expensesData?.length || 0,
      });

      setExpenses(expensesData || []);

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في جلب بيانات التقرير",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount) {
      toast({
        title: "خطأ",
        description: "يرجى ملء الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    try {
      // توليد رقم المصروف
      const { data: expenseNumber } = await supabase
        .rpc('generate_expense_number');

      const { error } = await supabase
        .from('expenses')
        .insert({
          expense_number: expenseNumber,
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          category: newExpense.category,
          payment_method: newExpense.payment_method,
          date: newExpense.date,
          notes: newExpense.notes,
          created_by: user?.id
        });

      if (error) throw error;

      setNewExpense({
        description: "",
        amount: "",
        category: "",
        payment_method: "",
        date: new Date().toISOString().split('T')[0],
        notes: ""
      });
      setIsAddExpenseOpen(false);
      fetchReportData();

      toast({
        title: "تم الحفظ",
        description: "تم إضافة المصروف بنجاح",
      });
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في إضافة المصروف",
        variant: "destructive",
      });
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setNewExpense({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category || "",
      payment_method: expense.payment_method || "",
      date: expense.date,
      notes: expense.notes || ""
    });
    setIsEditExpenseOpen(true);
  };

  const handleUpdateExpense = async () => {
    if (!newExpense.description || !newExpense.amount || !editingExpense) {
      toast({
        title: "خطأ",
        description: "يرجى ملء الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          category: newExpense.category,
          payment_method: newExpense.payment_method,
          date: newExpense.date,
          notes: newExpense.notes
        })
        .eq('id', editingExpense.id);

      if (error) throw error;

      setNewExpense({
        description: "",
        amount: "",
        category: "",
        payment_method: "",
        date: new Date().toISOString().split('T')[0],
        notes: ""
      });
      setIsEditExpenseOpen(false);
      setEditingExpense(null);
      fetchReportData();

      toast({
        title: "تم التحديث",
        description: "تم تحديث المصروف بنجاح",
      });
    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحديث المصروف",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل التقارير...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">التقارير المالية</h1>
        <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
          <DialogTrigger asChild>
            <Button variant="default" className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة مصروف
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة مصروف جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="description">الوصف</Label>
                <Input
                  id="description"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="وصف المصروف"
                />
              </div>
              <div>
                <Label htmlFor="amount">المبلغ</Label>
                <Input
                  id="amount"
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="category">الفئة</Label>
                <Select value={newExpense.category} onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office_supplies">مستلزمات مكتبية</SelectItem>
                    <SelectItem value="marketing">تسويق</SelectItem>
                    <SelectItem value="utilities">خدمات</SelectItem>
                    <SelectItem value="transportation">مواصلات</SelectItem>
                    <SelectItem value="equipment">معدات</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="payment_method">طريقة الدفع</Label>
                <Select value={newExpense.payment_method} onValueChange={(value) => setNewExpense({ ...newExpense, payment_method: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر طريقة الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="نقدي">نقدي</SelectItem>
                    <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
                    <SelectItem value="الشبكة">الشبكة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="date">التاريخ</Label>
                <Input
                  id="date"
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={newExpense.notes}
                  onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                  placeholder="ملاحظات إضافية..."
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddExpense} className="flex-1">
                  حفظ المصروف
                </Button>
                <Button variant="outline" onClick={() => setIsAddExpenseOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* فلاتر التقرير */}
      <Card>
        <CardHeader>
          <CardTitle>فترة التقرير</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>الفترة المحددة مسبقاً</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">هذا الشهر</SelectItem>
                  <SelectItem value="last_month">الشهر الماضي</SelectItem>
                  <SelectItem value="this_year">هذا العام</SelectItem>
                  <SelectItem value="last_year">العام الماضي</SelectItem>
                  <SelectItem value="custom">فترة مخصصة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>من تاريخ</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={selectedPeriod !== "custom"}
              />
            </div>
            <div>
              <Label>إلى تاريخ</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={selectedPeriod !== "custom"}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchReportData} className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                تحديث التقرير
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* إحصائيات سريعة */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {reportData.totalRevenue.toLocaleString()} ر.س
            </div>
            <p className="text-xs text-muted-foreground">
              {reportData.invoicesCount} فاتورة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {reportData.totalExpenses.toLocaleString()} ر.س
            </div>
            <p className="text-xs text-muted-foreground">
              {reportData.expensesCount} مصروف
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
            <DollarSign className={`h-4 w-4 ${reportData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${reportData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {reportData.netProfit.toLocaleString()} ر.س
            </div>
            <p className="text-xs text-muted-foreground">
              {reportData.netProfit >= 0 ? 'ربح' : 'خسارة'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">نسبة الربح</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {reportData.totalRevenue > 0 
                ? ((reportData.netProfit / reportData.totalRevenue) * 100).toFixed(1)
                : '0'
              }%
            </div>
            <p className="text-xs text-muted-foreground">
              من إجمالي الإيرادات
            </p>
          </CardContent>
        </Card>
      </div>

      {/* جدول المصروفات */}
      <Card>
        <CardHeader>
          <CardTitle>المصروفات</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">لا توجد مصروفات في هذه الفترة</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم المصروف</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>الفئة</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">
                      {expense.expense_number}
                    </TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>
                      {expense.category && (
                        <Badge variant="outline">
                          {expense.category === 'office_supplies' && 'مستلزمات مكتبية'}
                          {expense.category === 'marketing' && 'تسويق'}
                          {expense.category === 'utilities' && 'خدمات'}
                          {expense.category === 'transportation' && 'مواصلات'}
                          {expense.category === 'equipment' && 'معدات'}
                          {expense.category === 'other' && 'أخرى'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-bold text-red-600">
                      {expense.amount.toLocaleString()} ر.س
                    </TableCell>
                    <TableCell>{expense.payment_method}</TableCell>
                    <TableCell>
                      {new Date(expense.date).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditExpense(expense)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Expense Dialog */}
      <Dialog open={isEditExpenseOpen} onOpenChange={setIsEditExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل المصروف</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-description">الوصف</Label>
              <Input
                id="edit-description"
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                placeholder="وصف المصروف"
              />
            </div>
            <div>
              <Label htmlFor="edit-amount">المبلغ</Label>
              <Input
                id="edit-amount"
                type="number"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="edit-category">الفئة</Label>
              <Select value={newExpense.category} onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفئة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="office_supplies">مستلزمات مكتبية</SelectItem>
                  <SelectItem value="marketing">تسويق</SelectItem>
                  <SelectItem value="utilities">خدمات</SelectItem>
                  <SelectItem value="transportation">مواصلات</SelectItem>
                  <SelectItem value="equipment">معدات</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-payment-method">طريقة الدفع</Label>
              <Select value={newExpense.payment_method} onValueChange={(value) => setNewExpense({ ...newExpense, payment_method: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر طريقة الدفع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="نقدي">نقدي</SelectItem>
                  <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
                  <SelectItem value="الشبكة">الشبكة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-date">التاريخ</Label>
              <Input
                id="edit-date"
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-notes">ملاحظات</Label>
              <Textarea
                id="edit-notes"
                value={newExpense.notes}
                onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                placeholder="ملاحظات إضافية..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpdateExpense} className="flex-1">
                حفظ التغييرات
              </Button>
              <Button variant="outline" onClick={() => setIsEditExpenseOpen(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reports;