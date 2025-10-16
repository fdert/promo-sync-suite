// @ts-nocheck
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar, Edit, Search, AlertCircle, Clock } from "lucide-react";
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
  expense_date: string;
  notes?: string;
  created_at: string;
}

interface UnpaidInvoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  issue_date: string;
  due_date: string;
  customers: {
    id: string;
    name: string;
    phone: string;
  };
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
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([]);
  const [filteredUnpaidInvoices, setFilteredUnpaidInvoices] = useState<UnpaidInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [unpaidLoading, setUnpaidLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("this_month");
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  // Search filters for unpaid invoices
  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchStartDate, setSearchStartDate] = useState("");
  const [searchEndDate, setSearchEndDate] = useState("");
  const [searchMonth, setSearchMonth] = useState("");
  const [searchYear, setSearchYear] = useState("");
  
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    category: "",
    payment_method: "",
    expense_date: new Date().toISOString().split('T')[0],
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

  useEffect(() => {
    fetchUnpaidInvoices();
  }, []);

  useEffect(() => {
    filterUnpaidInvoices();
  }, [unpaidInvoices, searchName, searchPhone, searchStartDate, searchEndDate, searchMonth, searchYear]);

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

  const fetchUnpaidInvoices = async () => {
    try {
      setUnpaidLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          total_amount,
          issue_date,
          due_date,
          customers:customer_id (
            id,
            name,
            phone
          )
        `)
        .neq('status', 'مدفوع')
        .order('due_date', { ascending: true });

      if (error) throw error;

      setUnpaidInvoices(data || []);
    } catch (error) {
      console.error('Error fetching unpaid invoices:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في جلب الفواتير غير المدفوعة",
        variant: "destructive",
      });
    } finally {
      setUnpaidLoading(false);
    }
  };

  const filterUnpaidInvoices = () => {
    let filtered = [...unpaidInvoices];

    // فلترة بالاسم
    if (searchName) {
      filtered = filtered.filter(invoice => 
        invoice.customers?.name.toLowerCase().includes(searchName.toLowerCase())
      );
    }

    // فلترة برقم الجوال
    if (searchPhone) {
      filtered = filtered.filter(invoice => 
        invoice.customers?.phone.includes(searchPhone)
      );
    }

    // فلترة بالتاريخ من إلى
    if (searchStartDate && searchEndDate) {
      filtered = filtered.filter(invoice => {
        const issueDate = new Date(invoice.issue_date);
        const start = new Date(searchStartDate);
        const end = new Date(searchEndDate);
        return issueDate >= start && issueDate <= end;
      });
    }

    // فلترة بالشهر والسنة
    if (searchMonth && searchMonth !== "all" && searchYear && searchYear !== "all") {
      filtered = filtered.filter(invoice => {
        const issueDate = new Date(invoice.issue_date);
        return issueDate.getMonth() + 1 === parseInt(searchMonth) && 
               issueDate.getFullYear() === parseInt(searchYear);
      });
    } else if (searchYear && searchYear !== "all") {
      filtered = filtered.filter(invoice => {
        const issueDate = new Date(invoice.issue_date);
        return issueDate.getFullYear() === parseInt(searchYear);
      });
    } else if (searchMonth && searchMonth !== "all") {
      filtered = filtered.filter(invoice => {
        const issueDate = new Date(invoice.issue_date);
        return issueDate.getMonth() + 1 === parseInt(searchMonth);
      });
    }

    setFilteredUnpaidInvoices(filtered);
  };

  const clearSearchFilters = () => {
    setSearchName("");
    setSearchPhone("");
    setSearchStartDate("");
    setSearchEndDate("");
    setSearchMonth("");
    setSearchYear("");
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
          expense_date: newExpense.expense_date,
          notes: newExpense.notes,
          created_by: user?.id
        });

      if (error) throw error;

      setNewExpense({
        description: "",
        amount: "",
        category: "",
        payment_method: "",
        expense_date: new Date().toISOString().split('T')[0],
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
      expense_date: expense.expense_date,
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
          expense_date: newExpense.expense_date,
          notes: newExpense.notes
        })
        .eq('id', editingExpense.id);

      if (error) throw error;

      setNewExpense({
        description: "",
        amount: "",
        category: "",
        payment_method: "",
        expense_date: new Date().toISOString().split('T')[0],
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
                   type="text"
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
                <Label htmlFor="expense_date">التاريخ</Label>
                <Input
                  id="expense_date"
                  type="date"
                  value={newExpense.expense_date}
                  onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
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

      {/* Content Tabs */}
      <Tabs defaultValue="expenses" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expenses">المصروفات</TabsTrigger>
          <TabsTrigger value="unpaid">الفواتير غير المدفوعة</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
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
                          {new Date(expense.expense_date).toLocaleDateString('ar-SA')}
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
        </TabsContent>

        <TabsContent value="unpaid" className="space-y-4">
          {/* Search Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                فلاتر البحث
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <Label htmlFor="search-name">اسم العميل</Label>
                  <Input
                    id="search-name"
                    placeholder="البحث بالاسم..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="search-phone">رقم الجوال</Label>
                  <Input
                    id="search-phone"
                    placeholder="رقم الجوال..."
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="search-start-date">من تاريخ</Label>
                  <Input
                    id="search-start-date"
                    type="date"
                    value={searchStartDate}
                    onChange={(e) => setSearchStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="search-end-date">إلى تاريخ</Label>
                  <Input
                    id="search-end-date"
                    type="date"
                    value={searchEndDate}
                    onChange={(e) => setSearchEndDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="search-month">الشهر</Label>
                  <Select value={searchMonth} onValueChange={setSearchMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الشهر" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأشهر</SelectItem>
                      <SelectItem value="1">يناير</SelectItem>
                      <SelectItem value="2">فبراير</SelectItem>
                      <SelectItem value="3">مارس</SelectItem>
                      <SelectItem value="4">أبريل</SelectItem>
                      <SelectItem value="5">مايو</SelectItem>
                      <SelectItem value="6">يونيو</SelectItem>
                      <SelectItem value="7">يوليو</SelectItem>
                      <SelectItem value="8">أغسطس</SelectItem>
                      <SelectItem value="9">سبتمبر</SelectItem>
                      <SelectItem value="10">أكتوبر</SelectItem>
                      <SelectItem value="11">نوفمبر</SelectItem>
                      <SelectItem value="12">ديسمبر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="search-year">السنة</Label>
                  <Select value={searchYear} onValueChange={setSearchYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر السنة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع السنوات</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4">
                <Button variant="outline" onClick={clearSearchFilters}>
                  مسح الفلاتر
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Unpaid Invoices Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                الفواتير غير المدفوعة ({filteredUnpaidInvoices.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unpaidLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">جاري تحميل الفواتير...</p>
                </div>
              ) : filteredUnpaidInvoices.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد فواتير غير مدفوعة</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الفاتورة</TableHead>
                      <TableHead>اسم العميل</TableHead>
                      <TableHead>رقم الجوال</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>تاريخ الإصدار</TableHead>
                      <TableHead>تاريخ الاستحقاق</TableHead>
                      <TableHead>حالة التأخير</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUnpaidInvoices.map((invoice) => {
                      const dueDate = new Date(invoice.due_date);
                      const today = new Date();
                      const isOverdue = dueDate < today;
                      const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
                      
                      return (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            {invoice.invoice_number}
                          </TableCell>
                          <TableCell>{invoice.customers?.name || 'غير محدد'}</TableCell>
                          <TableCell>{invoice.customers?.phone || 'غير محدد'}</TableCell>
                          <TableCell className="font-bold text-red-600">
                            {invoice.total_amount.toLocaleString()} ر.س
                          </TableCell>
                          <TableCell>
                            {new Date(invoice.issue_date).toLocaleDateString('ar-SA')}
                          </TableCell>
                          <TableCell>
                            {new Date(invoice.due_date).toLocaleDateString('ar-SA')}
                          </TableCell>
                          <TableCell>
                            {isOverdue ? (
                              <Badge variant="destructive" className="gap-1">
                                <Clock className="h-3 w-3" />
                                متأخر {daysDiff} يوم
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <Clock className="h-3 w-3" />
                                مستحق قريباً
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                 type="text"
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
              <Label htmlFor="edit-expense-date">التاريخ</Label>
              <Input
                id="edit-expense-date"
                type="date"
                value={newExpense.expense_date}
                onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
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