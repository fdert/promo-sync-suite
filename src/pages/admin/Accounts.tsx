import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, TrendingUp, TrendingDown, DollarSign, CreditCard, Receipt, CalendarRange, BookOpen, BarChart3, Trash2, Edit2, Eye, Users, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Accounts = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountEntries, setAccountEntries] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [debtorInvoices, setDebtorInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [userRole, setUserRole] = useState('');
  
  // حقول البحث للعملاء المدينين
  const [debtorSearch, setDebtorSearch] = useState({
    customerName: '',
    dateFrom: '',
    dateTo: '',
    status: 'all'
  });
  
  const [newAccount, setNewAccount] = useState({
    account_name: "",
    account_type: "",
    description: ""
  });

  const [newEntry, setNewEntry] = useState({
    account_id: "",
    reference_type: "",
    reference_id: "",
    description: "",
    debit_amount: "",
    credit_amount: "",
    entry_date: new Date().toISOString().split('T')[0]
  });

  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    category: "",
    date: new Date().toISOString().split('T')[0],
    payment_method: "",
    notes: ""
  });

  const { toast } = useToast();

  // جلب دور المستخدم
  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (data && !error) {
          setUserRole(data.role);
        }
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  // جلب الحسابات المحاسبية
  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .order('account_type', { ascending: true })
        .order('account_name', { ascending: true });

      if (error) {
        console.error('Error fetching accounts:', error);
        return;
      }

      setAccounts(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // جلب قيود الحسابات
  const fetchAccountEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('account_entries')
        .select(`
          *,
          accounts(account_name, account_type)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching account entries:', error);
        return;
      }

      setAccountEntries(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // جلب المصروفات
  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching expenses:', error);
        return;
      }

      setExpenses(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // جلب الفواتير للحصول على الإيرادات (جميع الفواتير وليس المدفوعة فقط)
  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('issue_date', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching invoices:', error);
        return;
      }

      setInvoices(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // جلب فواتير العملاء المدينين
  const fetchDebtorInvoices = async () => {
    try {
      console.log('Fetching debtor invoices with search filters:', debtorSearch);
      
      let query = supabase
        .from('invoices')
        .select(`
          *,
          customers(name, phone, whatsapp_number)
        `)
        .order('issue_date', { ascending: false });

      // تطبيق فلاتر البحث
      if (debtorSearch.customerName) {
        // البحث في اسم العميل باستخدام فلترة JavaScript لأن Supabase تحتاج معالجة خاصة للجوين
        // سنقوم بالفلترة بعد جلب البيانات
      }

      if (debtorSearch.dateFrom) {
        query = query.gte('issue_date', debtorSearch.dateFrom);
      }

      if (debtorSearch.dateTo) {
        query = query.lte('issue_date', debtorSearch.dateTo);
      }

      if (debtorSearch.status !== 'all') {
        query = query.eq('status', debtorSearch.status);
      }

      const { data, error } = await query;

      console.log('All invoices data:', data);
      console.log('Invoices error:', error);

      if (error) {
        console.error('Error fetching debtor invoices:', error);
        return;
      }

      // فلترة الفواتير التي لديها مبالغ متبقية (غير مسددة بالكامل)
      let debtorInvoicesFiltered = (data || []).filter(invoice => {
        const remainingAmount = invoice.total_amount - (invoice.paid_amount || 0);
        return remainingAmount > 0;
      });

      // تطبيق فلتر البحث في اسم العميل
      if (debtorSearch.customerName) {
        debtorInvoicesFiltered = debtorInvoicesFiltered.filter(invoice => 
          invoice.customers?.name?.toLowerCase().includes(debtorSearch.customerName.toLowerCase())
        );
      }

      // تطبيق فلتر الحالة
      if (debtorSearch.status !== 'all') {
        debtorInvoicesFiltered = debtorInvoicesFiltered.filter(invoice => {
          const remainingAmount = invoice.total_amount - (invoice.paid_amount || 0);
          const paidAmount = invoice.paid_amount || 0;
          
          if (debtorSearch.status === 'partial') {
            return paidAmount > 0 && remainingAmount > 0; // مدفوع جزئياً
          } else if (debtorSearch.status === 'unpaid') {
            return paidAmount === 0; // غير مدفوع نهائياً
          }
          return true;
        });
      }

      console.log('Filtered debtor invoices:', debtorInvoicesFiltered);
      setDebtorInvoices(debtorInvoicesFiltered);
      
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchUserRole(),
        fetchAccounts(), 
        fetchAccountEntries(), 
        fetchExpenses(), 
        fetchInvoices(),
        fetchDebtorInvoices()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  // تحديث بيانات العملاء المدينين عند تغيير فلاتر البحث
  useEffect(() => {
    fetchDebtorInvoices();
  }, [debtorSearch]);

  // إضافة حساب جديد
  const handleAddAccount = async () => {
    if (!newAccount.account_name || !newAccount.account_type) {
      toast({
        title: "خطأ",
        description: "يرجى ملء الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('accounts')
        .insert({
          account_name: newAccount.account_name,
          account_type: newAccount.account_type,
          description: newAccount.description,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) {
        console.error('Error adding account:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في إضافة الحساب",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "نجح",
        description: "تم إضافة الحساب بنجاح",
      });

      setIsAddAccountOpen(false);
      setNewAccount({
        account_name: "",
        account_type: "",
        description: ""
      });
      fetchAccounts();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // إضافة قيد محاسبي
  const handleAddEntry = async () => {
    if (!newEntry.account_id || !newEntry.description || (!newEntry.debit_amount && !newEntry.credit_amount)) {
      toast({
        title: "خطأ",
        description: "يرجى ملء الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('account_entries')
        .insert({
          account_id: newEntry.account_id,
          reference_type: newEntry.reference_type || 'أخرى',
          reference_id: newEntry.reference_id,
          description: newEntry.description,
          debit_amount: parseFloat(newEntry.debit_amount) || 0,
          credit_amount: parseFloat(newEntry.credit_amount) || 0,
          entry_date: newEntry.entry_date,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) {
        console.error('Error adding entry:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في إضافة القيد",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "نجح",
        description: "تم إضافة القيد بنجاح",
      });

      setIsAddEntryOpen(false);
      setNewEntry({
        account_id: "",
        reference_type: "",
        reference_id: "",
        description: "",
        debit_amount: "",
        credit_amount: "",
        entry_date: new Date().toISOString().split('T')[0]
      });
      fetchAccountEntries();
      fetchAccounts(); // تحديث الأرصدة
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // إضافة مصروف جديد
  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount || !newExpense.category) {
      toast({
        title: "خطأ",
        description: "يرجى ملء الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: expenseNumber, error: expenseError } = await supabase.rpc('generate_expense_number');
      
      if (expenseError) {
        console.error('Error generating expense number:', expenseError);
        toast({
          title: "خطأ",
          description: "حدث خطأ في إنشاء رقم المصروف",
          variant: "destructive",
        });
        return;
      }
      
      const { error } = await supabase
        .from('expenses')
        .insert({
          expense_number: expenseNumber,
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          category: newExpense.category,
          date: newExpense.date,
          payment_method: newExpense.payment_method,
          notes: newExpense.notes,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) {
        console.error('Error adding expense:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في إضافة المصروف",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "نجح",
        description: "تم إضافة المصروف بنجاح",
      });

      setIsAddExpenseOpen(false);
      setNewExpense({
        description: "",
        amount: "",
        category: "",
        date: new Date().toISOString().split('T')[0],
        payment_method: "",
        notes: ""
      });
      fetchExpenses();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // حذف حساب
  const handleDeleteAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ is_active: false })
        .eq('id', accountId);

      if (error) {
        console.error('Error deleting account:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في حذف الحساب",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "تم الحذف",
        description: "تم حذف الحساب بنجاح",
      });

      fetchAccounts();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // إصلاح الأرصدة والقيود المفقودة من الفواتير الموجودة
  const handleFixAccountingEntries = async () => {
    try {
      // جلب جميع الفواتير
      const { data: allInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          *,
          customers(name)
        `);

      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError);
        return;
      }

      let fixedCount = 0;

      for (const invoice of allInvoices || []) {
        // التحقق من وجود قيود محاسبية للفاتورة
        const { data: existingEntries } = await supabase
          .from('account_entries')
          .select('id')
          .eq('reference_type', 'فاتورة')
          .eq('reference_id', invoice.id);

        if (!existingEntries || existingEntries.length === 0) {
          // إضافة القيود المحاسبية المفقودة باستخدام الدالة المحاسبية
          const { error: entryError } = await supabase.rpc('create_invoice_accounting_entry', {
            invoice_id: invoice.id,
            customer_name: invoice.customers?.name || 'عميل غير محدد',
            total_amount: invoice.total_amount
          });
          
          if (entryError) {
            console.error('Error creating accounting entry:', entryError);
          } else {
            fixedCount++;
          }
        }
      }

      toast({
        title: "تم الإصلاح",
        description: `تم إصلاح ${fixedCount} فاتورة`,
      });

      // تحديث البيانات
      fetchAccounts();
      fetchAccountEntries();
    } catch (error) {
      console.error('Error fixing entries:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في إصلاح القيود",
        variant: "destructive",
      });
    }
  };

  // حساب الإحصائيات
  const monthlyIncome = invoices
    .filter(invoice => {
      const issueDate = new Date(invoice.issue_date);
      const currentMonth = new Date();
      return issueDate.getMonth() === currentMonth.getMonth() && 
             issueDate.getFullYear() === currentMonth.getFullYear() &&
             invoice.status === 'مدفوع';
    })
    .reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);

  const monthlyExpenses = expenses
    .filter(expense => {
      const expenseDate = new Date(expense.date);
      const currentMonth = new Date();
      return expenseDate.getMonth() === currentMonth.getMonth() && 
             expenseDate.getFullYear() === currentMonth.getFullYear();
    })
    .reduce((sum, expense) => sum + (expense.amount || 0), 0);

  const netProfit = monthlyIncome - monthlyExpenses;

  // تجميع الحسابات حسب النوع
  const accountsByType = accounts.reduce((acc: Record<string, any[]>, account) => {
    if (!acc[account.account_type]) {
      acc[account.account_type] = [];
    }
    acc[account.account_type].push(account);
    return acc;
  }, {});

  // حساب إجمالي المبالغ المستحقة من العملاء المدينين
  const totalDebts = debtorInvoices.reduce((sum, invoice) => {
    const remainingAmount = invoice.total_amount - (invoice.paid_amount || 0);
    return sum + remainingAmount;
  }, 0);

  if (loading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">النظام المحاسبي</h1>
          <p className="text-muted-foreground">إدارة الحسابات والقيود المحاسبية</p>
        </div>
        <div className="flex gap-2">
          {userRole === 'admin' && (
            <Button 
              variant="outline" 
              onClick={handleFixAccountingEntries}
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              إصلاح القيود
            </Button>
          )}
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الإيرادات الشهرية</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{monthlyIncome.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">هذا الشهر</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المصروفات الشهرية</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{monthlyExpenses.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">هذا الشهر</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {netProfit.toLocaleString()} ر.س
            </div>
            <p className="text-xs text-muted-foreground">هذا الشهر</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الديون</CardTitle>
            <Users className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{totalDebts.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">{debtorInvoices.length} فاتورة مستحقة</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عدد الحسابات</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">حساب نشط</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="accounts">الحسابات</TabsTrigger>
          <TabsTrigger value="entries">القيود</TabsTrigger>
          <TabsTrigger value="expenses">المصروفات</TabsTrigger>
          <TabsTrigger value="debtors">العملاء المدينون</TabsTrigger>
          <TabsTrigger value="reports">التقارير</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">الحسابات المحاسبية</h2>
            <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  إضافة حساب جديد
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة حساب محاسبي جديد</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="account_name">اسم الحساب</Label>
                    <Input
                      id="account_name"
                      value={newAccount.account_name}
                      onChange={(e) => setNewAccount({...newAccount, account_name: e.target.value})}
                      placeholder="اسم الحساب..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="account_type">نوع الحساب</Label>
                    <Select value={newAccount.account_type} onValueChange={(value) => setNewAccount({...newAccount, account_type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع الحساب" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="أصول">أصول</SelectItem>
                        <SelectItem value="خصوم">خصوم</SelectItem>
                        <SelectItem value="حقوق ملكية">حقوق ملكية</SelectItem>
                        <SelectItem value="إيرادات">إيرادات</SelectItem>
                        <SelectItem value="مصروفات">مصروفات</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="description">الوصف</Label>
                    <Textarea
                      id="description"
                      value={newAccount.description}
                      onChange={(e) => setNewAccount({...newAccount, description: e.target.value})}
                      placeholder="وصف الحساب..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddAccountOpen(false)}>
                      إلغاء
                    </Button>
                    <Button onClick={handleAddAccount}>
                      إضافة الحساب
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* عرض الحسابات مجمعة حسب النوع */}
          {Object.entries(accountsByType).map(([type, accountList]: [string, any[]]) => (
            <Card key={type}>
              <CardHeader>
                <CardTitle>{type}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(accountList as any[]).map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{account.account_name}</h3>
                          <p className="text-sm text-muted-foreground">{account.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-lg font-bold ${account.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {account.balance?.toLocaleString()} ر.س
                          </p>
                          <p className="text-xs text-muted-foreground">الرصيد الحالي</p>
                        </div>
                        {userRole === 'admin' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من حذف الحساب "{account.account_name}"؟
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteAccount(account.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="entries" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">القيود المحاسبية</h2>
            <Dialog open={isAddEntryOpen} onOpenChange={setIsAddEntryOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  إضافة قيد جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>إضافة قيد محاسبي جديد</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="account_id">الحساب</Label>
                      <Select value={newEntry.account_id} onValueChange={(value) => setNewEntry({...newEntry, account_id: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الحساب" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.account_name} ({account.account_type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="reference_type">نوع المرجع</Label>
                      <Select value={newEntry.reference_type} onValueChange={(value) => setNewEntry({...newEntry, reference_type: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر النوع" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="فاتورة">فاتورة</SelectItem>
                          <SelectItem value="مصروف">مصروف</SelectItem>
                          <SelectItem value="دفعة">دفعة</SelectItem>
                          <SelectItem value="تسوية">تسوية</SelectItem>
                          <SelectItem value="أخرى">أخرى</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">الوصف</Label>
                    <Input
                      id="description"
                      value={newEntry.description}
                      onChange={(e) => setNewEntry({...newEntry, description: e.target.value})}
                      placeholder="وصف القيد..."
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="debit_amount">المبلغ المدين</Label>
                      <Input
                        id="debit_amount"
                        type="number"
                        value={newEntry.debit_amount}
                        onChange={(e) => setNewEntry({...newEntry, debit_amount: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="credit_amount">المبلغ الدائن</Label>
                      <Input
                        id="credit_amount"
                        type="number"
                        value={newEntry.credit_amount}
                        onChange={(e) => setNewEntry({...newEntry, credit_amount: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="entry_date">التاريخ</Label>
                      <Input
                        id="entry_date"
                        type="date"
                        value={newEntry.entry_date}
                        onChange={(e) => setNewEntry({...newEntry, entry_date: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddEntryOpen(false)}>
                      إلغاء
                    </Button>
                    <Button onClick={handleAddEntry}>
                      إضافة القيد
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="space-y-2">
                {accountEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                        <Receipt className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{entry.description}</h3>
                        <p className="text-sm text-muted-foreground">
                          {entry.accounts?.account_name} • {entry.reference_type} • {entry.entry_date}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-4">
                        {entry.debit_amount > 0 && (
                          <div>
                            <p className="text-sm text-muted-foreground">مدين</p>
                            <p className="font-bold text-red-600">+{entry.debit_amount?.toLocaleString()} ر.س</p>
                          </div>
                        )}
                        {entry.credit_amount > 0 && (
                          <div>
                            <p className="text-sm text-muted-foreground">دائن</p>
                            <p className="font-bold text-green-600">-{entry.credit_amount?.toLocaleString()} ر.س</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">المصروفات</h2>
            <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  إضافة مصروف جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>إضافة مصروف جديد</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="description">وصف المصروف</Label>
                      <Input
                        id="description"
                        value={newExpense.description}
                        onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                        placeholder="وصف المصروف..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="amount">المبلغ (ر.س)</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">الفئة</Label>
                      <Select value={newExpense.category} onValueChange={(value) => setNewExpense({...newExpense, category: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الفئة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="مكتبية">مصروفات مكتبية</SelectItem>
                          <SelectItem value="تشغيلية">مصروفات تشغيلية</SelectItem>
                          <SelectItem value="تسويق">تسويق وإعلان</SelectItem>
                          <SelectItem value="صيانة">صيانة وإصلاح</SelectItem>
                          <SelectItem value="مواصلات">مواصلات</SelectItem>
                          <SelectItem value="أخرى">أخرى</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="date">التاريخ</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newExpense.date}
                        onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="payment_method">طريقة الدفع</Label>
                    <Select value={newExpense.payment_method} onValueChange={(value) => setNewExpense({...newExpense, payment_method: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر طريقة الدفع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="نقدي">نقدي</SelectItem>
                        <SelectItem value="بنكي">تحويل بنكي</SelectItem>
                        <SelectItem value="بطاقة ائتمان">بطاقة ائتمان</SelectItem>
                        <SelectItem value="شيك">شيك</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="notes">ملاحظات</Label>
                    <Textarea
                      id="notes"
                      value={newExpense.notes}
                      onChange={(e) => setNewExpense({...newExpense, notes: e.target.value})}
                      placeholder="ملاحظات إضافية..."
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddExpenseOpen(false)}>
                      إلغاء
                    </Button>
                    <Button onClick={handleAddExpense}>
                      إضافة المصروف
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="space-y-2">
                {expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                        <Receipt className="h-6 w-6 text-destructive" />
                      </div>
                      <div>
                        <h3 className="font-medium">{expense.description}</h3>
                        <p className="text-sm text-muted-foreground">{expense.category} • {expense.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-destructive">-{expense.amount?.toLocaleString()} ر.س</p>
                      <p className="text-sm text-muted-foreground">{expense.expense_number}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debtors" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">العملاء المدينون</h2>
            <div className="text-sm text-muted-foreground">
              إجمالي المبالغ المستحقة: <span className="font-bold text-warning">{totalDebts.toLocaleString()} ر.س</span>
            </div>
          </div>

          {/* فلاتر البحث */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                فلاتر البحث
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label htmlFor="customerName">اسم العميل</Label>
                  <Input
                    id="customerName"
                    placeholder="البحث باسم العميل..."
                    value={debtorSearch.customerName}
                    onChange={(e) => setDebtorSearch({...debtorSearch, customerName: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="dateFrom">من تاريخ</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={debtorSearch.dateFrom}
                    onChange={(e) => setDebtorSearch({...debtorSearch, dateFrom: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="dateTo">إلى تاريخ</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={debtorSearch.dateTo}
                    onChange={(e) => setDebtorSearch({...debtorSearch, dateTo: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="status">حالة الفاتورة</Label>
                    <Select value={debtorSearch.status} onValueChange={(value) => setDebtorSearch({...debtorSearch, status: value})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="اختر الحالة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الحالات</SelectItem>
                        <SelectItem value="partial">مدفوع جزئياً</SelectItem>
                        <SelectItem value="unpaid">غير مدفوع</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setDebtorSearch({customerName: '', dateFrom: '', dateTo: '', status: 'all'})}
                  className="gap-2"
                >
                  <Search className="h-4 w-4" />
                  مسح الفلاتر
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* قائمة العملاء المدينين */}
          <Card>
            <CardContent className="p-0">
              {debtorInvoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد فواتير مستحقة حالياً</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {debtorInvoices.map((invoice) => {
                    const remainingAmount = invoice.total_amount - (invoice.paid_amount || 0);
                    const daysPastDue = Math.floor((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <div key={invoice.id} className="flex items-center justify-between p-4 border-b hover:bg-muted/50">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
                            <Receipt className="h-6 w-6 text-warning" />
                          </div>
                          <div>
                            <h3 className="font-medium">{invoice.customers?.name || 'عميل غير محدد'}</h3>
                            <p className="text-sm text-muted-foreground">
                              فاتورة: {invoice.invoice_number} • تاريخ الإصدار: {invoice.issue_date}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              تاريخ الاستحقاق: {invoice.due_date}
                              {daysPastDue > 0 && (
                                <span className="text-destructive font-medium"> • متأخر {daysPastDue} يوم</span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex flex-col gap-1">
                            <Badge variant={invoice.status === 'قيد الانتظار' ? 'destructive' : 'secondary'}>
                              {invoice.status}
                            </Badge>
                            <p className="font-bold text-lg text-warning">
                              {remainingAmount.toLocaleString()} ر.س
                            </p>
                            <p className="text-sm text-muted-foreground">
                              من أصل {invoice.total_amount.toLocaleString()} ر.س
                            </p>
                            {invoice.paid_amount > 0 && (
                              <p className="text-sm text-success">
                                مدفوع: {invoice.paid_amount.toLocaleString()} ر.س
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {invoice.customers?.phone && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={`tel:${invoice.customers.phone}`}>
                                <Receipt className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          {invoice.customers?.whatsapp_number && (
                            <Button variant="outline" size="sm" asChild>
                              <a 
                                href={`https://wa.me/${invoice.customers.whatsapp_number.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ملخص العملاء المدينين */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">عدد الفواتير المستحقة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{debtorInvoices.length}</div>
                <p className="text-xs text-muted-foreground">فاتورة غير مسددة</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">متوسط المبلغ المستحق</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">
                  {debtorInvoices.length > 0 ? Math.round(totalDebts / debtorInvoices.length).toLocaleString() : 0} ر.س
                </div>
                <p className="text-xs text-muted-foreground">لكل فاتورة</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">الفواتير المتأخرة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {debtorInvoices.filter(invoice => 
                    new Date(invoice.due_date) < new Date()
                  ).length}
                </div>
                <p className="text-xs text-muted-foreground">فاتورة متأخرة الدفع</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <h2 className="text-xl font-semibold">التقارير المالية</h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>ميزان المراجعة</CardTitle>
                <CardDescription>أرصدة الحسابات الحالية</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(accountsByType).map(([type, accountList]: [string, any[]]) => (
                    <div key={type}>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2">{type}</h4>
                      {(accountList as any[]).map((account) => (
                        <div key={account.id} className="flex justify-between items-center py-1">
                          <span className="text-sm">{account.account_name}</span>
                          <span className={`text-sm font-medium ${account.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {account.balance?.toLocaleString()} ر.س
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>قائمة الدخل</CardTitle>
                <CardDescription>الشهر الحالي</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="font-medium text-success">الإيرادات</span>
                    <span className="font-bold text-success">{monthlyIncome.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="font-medium text-destructive">المصروفات</span>
                    <span className="font-bold text-destructive">{monthlyExpenses.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-gray-300">
                    <span className="font-bold">صافي الربح</span>
                    <span className={`font-bold text-lg ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {netProfit.toLocaleString()} ر.س
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Accounts;