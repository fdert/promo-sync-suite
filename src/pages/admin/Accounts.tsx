// @ts-nocheck
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
import { Plus, TrendingUp, TrendingDown, DollarSign, CreditCard, Receipt, CalendarRange, BookOpen, BarChart3, Trash2, Edit2, Eye, Users, Search, Filter, RefreshCw, Eraser, AlertTriangle, Download, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';

const Accounts = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountEntries, setAccountEntries] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [debtorInvoices, setDebtorInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [userRole, setUserRole] = useState('');
  
  // فلاتر زمنية للتقارير
  const [dateFilter, setDateFilter] = useState({
    period: 'current_month', // current_month, last_month, current_year, custom
    startDate: '',
    endDate: ''
  });
  
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
    expense_date: new Date().toISOString().split('T')[0],
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
          .maybeSingle();
        
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
        toast({
          title: "خطأ",
          description: "فشل في جلب الحسابات المحاسبية",
          variant: "destructive",
        });
        return;
      }

      setAccounts(data || []);
      console.log('تم جلب الحسابات:', data?.length || 0, 'حساب');
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع في جلب الحسابات",
        variant: "destructive",
      });
    }
  };

  // جلب قيود الحسابات
  const fetchAccountEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('account_entries')
        .select(`
          *,
          accounts(account_name, account_type, account_number)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching account entries:', error);
        toast({
          title: "خطأ",
          description: "فشل في جلب القيود المحاسبية",
          variant: "destructive",
        });
        return;
      }

      setAccountEntries(data || []);
      console.log('تم جلب القيود:', data?.length || 0, 'قيد');
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع في جلب القيود",
        variant: "destructive",
      });
    }
  };

  // جلب المصروفات
  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching expenses:', error);
        toast({
          title: "خطأ",
          description: "فشل في جلب المصروفات",
          variant: "destructive",
        });
        return;
      }

      setExpenses(data || []);
      console.log('تم جلب المصروفات:', data?.length || 0, 'مصروف');
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع في جلب المصروفات",
        variant: "destructive",
      });
    }
  };

  // تم حذف دالة fetchInvoices واستبدالها بدالة fetchMonthlyRevenue في مكان آخر

  // دالة جلب العملاء المدينين من الطلبات
  const fetchDebtorInvoices = async () => {
    try {
      console.log('Fetching debtor customers from orders with search filters:', debtorSearch);
      
      // استخدام العرض الجديد للعملاء المدينين من الطلبات
      const { data: debtorData, error } = await supabase
        .from('customer_order_balances')
        .select('*');

      if (error) {
        console.error('Error fetching customer order balances:', error);
        toast({
          title: "خطأ",
          description: "فشل في جلب أرصدة العملاء",
          variant: "destructive",
        });
        return;
      }

      let filteredCustomers = debtorData || [];

      // تطبيق فلتر البحث في اسم العميل
      if (debtorSearch.customerName) {
        filteredCustomers = filteredCustomers.filter((customer: any) => {
          return customer.customer_name?.toLowerCase().includes(debtorSearch.customerName.toLowerCase());
        });
      }

      // تطبيق فلتر الحالة
      if (debtorSearch.status !== 'all') {
        filteredCustomers = filteredCustomers.filter((customer: any) => {
          const remainingAmount = customer.balance || 0;
          const paidAmount = customer.paid_amount || 0;
          
          if (debtorSearch.status === 'partial') {
            return paidAmount > 0 && remainingAmount > 0.01;
          } else if (debtorSearch.status === 'unpaid') {
            return paidAmount <= 0.01;
          } else if (debtorSearch.status === 'debtor') {
            return remainingAmount > 0.01;
          }
          return remainingAmount > 0.01;
        });
      }

      console.log('Filtered debtor customers from orders:', filteredCustomers);
      
      // تحويل البيانات لتتوافق مع الواجهة الحالية
      const processedData = filteredCustomers.map((customer: any) => ({
        id: customer.customer_id,
        customer_id: customer.customer_id,
        customer_name: customer.customer_name,
        total_amount: customer.total_amount || 0,
        calculated_paid_amount: customer.paid_amount || 0,
        remaining_amount: customer.balance || 0,
        total_orders: customer.total_orders || 0
      }));

      setDebtorInvoices(processedData);
      console.log('تم جلب العملاء المدينين:', processedData.length, 'عميل');
    } catch (error) {
      console.error('Error fetching debtor invoices:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في جلب العملاء المدينين",
        variant: "destructive",
      });
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
        fetchDebtorInvoices(),
        fetchMonthlyRevenue()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  // دالة لإعادة تحديث جميع البيانات
  const refreshAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchAccounts(), 
      fetchAccountEntries(), 
      fetchExpenses(), 
      fetchDebtorInvoices(),
      fetchMonthlyRevenue()
    ]);
    setLoading(false);
    toast({
      title: "تم التحديث",
      description: "تم تحديث جميع البيانات بنجاح",
    });
  };

  // تحديث بيانات العملاء المدينين عند تغيير فلاتر البحث
  useEffect(() => {
    fetchDebtorInvoices();
  }, [debtorSearch]);

  // تحديث البيانات المفلترة عند تغيير فلتر التاريخ
  useEffect(() => {
    if (monthlyIncome !== undefined) {
      fetchFilteredData();
    }
  }, [dateFilter]);

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
      // الحصول على أعلى رقم حساب موجود
      const { data: existingAccounts, error: fetchError } = await supabase
        .from('accounts')
        .select('account_number')
        .order('account_number', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('Error fetching accounts:', fetchError);
        toast({
          title: "خطأ",
          description: "حدث خطأ في جلب بيانات الحسابات",
          variant: "destructive",
        });
        return;
      }

      // توليد رقم حساب فريد جديد
      let accountNumber = '0001';
      if (existingAccounts && existingAccounts.length > 0) {
        const lastNumber = parseInt(existingAccounts[0].account_number) || 0;
        accountNumber = (lastNumber + 1).toString().padStart(4, '0');
      }
      
      const { error } = await supabase
        .from('accounts')
        .insert({
          account_number: accountNumber,
          account_name: newAccount.account_name.trim(),
          account_type: newAccount.account_type,
          balance: 0
        });

      if (error) {
        console.error('Error adding account:', error);
        toast({
          title: "خطأ",
          description: error.message || "حدث خطأ في إضافة الحساب",
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
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
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
          debit: parseFloat(newEntry.debit_amount) || 0,
          credit: parseFloat(newEntry.credit_amount) || 0,
          entry_date: newEntry.entry_date
        });

      if (error) {
        console.error('Error adding entry:', error);
        toast({
          title: "خطأ",
          description: error.message || "حدث خطأ في إضافة القيد",
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
    // تحقق صارم من القيم
    const amountNum = Number(newExpense.amount);
    if (
      !newExpense.description?.trim() ||
      !newExpense.category?.trim() ||
      !newExpense.payment_method?.trim() ||
      !newExpense.expense_date?.toString().trim() ||
      !isFinite(amountNum) || amountNum <= 0
    ) {
      toast({
        title: "خطأ",
        description: "يرجى تعبئة جميع الحقول بشكل صحيح (المبلغ رقم أكبر من صفر)",
        variant: "destructive",
      });
      return;
    }

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      // إضافة المصروف
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          expense_type: newExpense.category,
          description: newExpense.description.trim(),
          amount: amountNum,
          expense_date: newExpense.expense_date,
          payment_method: newExpense.payment_method,
          notes: newExpense.notes,
          created_by: userId
        })
        .select()
        .single();

      if (expenseError) {
        console.error('Error adding expense:', expenseError);
        toast({
          title: "خطأ",
          description: expenseError.message || "حدث خطأ في إضافة المصروف",
          variant: "destructive",
        });
        return;
      }

      // إنشاء القيد المحاسبي
      try {
        const { data: expenseAccount } = await supabase
          .from('accounts')
          .select('id')
          .eq('account_type', 'مصروفات')
          .eq('is_active', true)
          .limit(1)
          .single();

        const accountType = newExpense.payment_method === 'cash' ? 'نقدية' : 
                           newExpense.payment_method === 'bank_transfer' ? 'بنك' :
                           newExpense.payment_method === 'card' ? 'الشبكة' : 'نقدية';
        
        const { data: cashAccount } = await supabase
          .from('accounts')
          .select('id')
          .eq('account_type', accountType)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (expenseAccount && cashAccount) {
          await supabase.from('account_entries').insert([
            {
              account_id: expenseAccount.id,
              debit: amountNum,
              credit: 0,
              reference_type: 'expense',
              reference_id: expenseData.id,
              description: `مصروف: ${newExpense.description}`,
              created_by: userId
            },
            {
              account_id: cashAccount.id,
              debit: 0,
              credit: amountNum,
              reference_type: 'expense',
              reference_id: expenseData.id,
              description: `دفع مصروف: ${newExpense.description}`,
              created_by: userId
            }
          ]);
        }
      } catch (entryError) {
        console.error('Error creating account entries:', entryError);
      }

      toast({
        title: "نجح",
        description: "تم إضافة المصروف والقيد المحاسبي بنجاح",
      });

      setIsAddExpenseOpen(false);
      setNewExpense({
        description: "",
        amount: "",
        category: "",
        expense_date: new Date().toISOString().split('T')[0],
        payment_method: "",
        notes: ""
      });
      fetchExpenses();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // تعديل مصروف
  const handleEditExpense = async () => {
    if (!editingExpense || !editingExpense.description || !editingExpense.amount || !editingExpense.expense_type) {
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
          expense_type: editingExpense.expense_type,
          description: editingExpense.description,
          amount: parseFloat(editingExpense.amount),
          expense_date: editingExpense.expense_date,
          payment_method: editingExpense.payment_method,
          notes: editingExpense.notes,
        })
        .eq('id', editingExpense.id);

      if (error) {
        console.error('Error updating expense:', error);
        toast({
          title: "خطأ",
          description: error.message || "حدث خطأ في تحديث المصروف",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "تم التحديث",
        description: "تم تحديث المصروف بنجاح",
      });

      setIsEditExpenseOpen(false);
      setEditingExpense(null);
      fetchExpenses();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // حذف مصروف
  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) {
        console.error('Error deleting expense:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في حذف المصروف",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "تم الحذف",
        description: "تم حذف المصروف بنجاح",
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

  // تصدير العملاء المدينين إلى PDF - طريقة بسيطة
  const exportDebtorsToPDF = () => {
    try {
      // تحويل البيانات إلى نص منسق
      let pdfContent = '=== تقرير العملاء المدينين ===\n\n';
      pdfContent += `تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}\n\n`;
      pdfContent += '------------------------------------------------\n\n';
      
      debtorInvoices.forEach((customer, index) => {
        pdfContent += `${index + 1}. ${customer.customer_name || 'غير محدد'}\n`;
        pdfContent += `   عدد الطلبات: ${customer.total_orders || 0}\n`;
        pdfContent += `   إجمالي المبلغ: ${(customer.total_amount || 0).toLocaleString()} ر.س\n`;
        pdfContent += `   المبلغ المدفوع: ${(customer.calculated_paid_amount || 0).toLocaleString()} ر.س\n`;
        pdfContent += `   المبلغ المستحق: ${(customer.remaining_amount || 0).toLocaleString()} ر.س\n\n`;
      });
      
      pdfContent += '------------------------------------------------\n';
      pdfContent += `إجمالي المبالغ المستحقة: ${totalDebts.toLocaleString()} ر.س\n`;
      
      // إنشاء blob وتنزيله
      const blob = new Blob([pdfContent], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `تقرير_العملاء_المدينين_${new Date().toLocaleDateString('ar-SA').replace(/\//g, '-')}.txt`;
      link.click();
      
      toast({
        title: "تم التصدير",
        description: "تم تصدير التقرير بنجاح",
      });
    } catch (error) {
      console.error('Error exporting:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تصدير التقرير",
        variant: "destructive",
      });
    }
  };

  // تصدير العملاء المدينين إلى Excel
  const exportDebtorsToExcel = () => {
    try {
      // تجهيز البيانات
      const exportData = debtorInvoices.map(customer => ({
        'اسم العميل': customer.customer_name || 'غير محدد',
        'عدد الطلبات': customer.total_orders || 0,
        'إجمالي المبلغ (ر.س)': customer.total_amount || 0,
        'المبلغ المدفوع (ر.س)': customer.calculated_paid_amount || 0,
        'المبلغ المستحق (ر.س)': customer.remaining_amount || 0,
      }));
      
      // إضافة صف الملخص
      exportData.push({
        'اسم العميل': 'إجمالي المبالغ المستحقة',
        'عدد الطلبات': '',
        'إجمالي المبلغ (ر.س)': '',
        'المبلغ المدفوع (ر.س)': '',
        'المبلغ المستحق (ر.س)': totalDebts,
      });
      
      // إنشاء ورقة العمل
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // تعيين عرض الأعمدة
      ws['!cols'] = [
        { wch: 30 }, // اسم العميل
        { wch: 15 }, // عدد الطلبات
        { wch: 20 }, // إجمالي المبلغ
        { wch: 20 }, // المبلغ المدفوع
        { wch: 20 }, // المبلغ المستحق
      ];
      
      // إنشاء المصنف
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'العملاء المدينون');
      
      // حفظ الملف
      XLSX.writeFile(wb, `تقرير_العملاء_المدينين_${new Date().toLocaleDateString('ar-SA')}.xlsx`);
      
      toast({
        title: "تم التصدير",
        description: "تم تصدير التقرير إلى Excel بنجاح",
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تصدير التقرير إلى Excel",
        variant: "destructive",
      });
    }
  };

  // إصلاح الأرصدة والقيود المفقودة من الطلبات الموجودة
  const handleFixAccountingEntries = async () => {
    try {
      // جلب جميع الطلبات المكتملة
      const { data: allOrders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          customers(name)
        `)
        .eq('status', 'مكتمل');

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        return;
      }

      let fixedCount = 0;

      for (const order of allOrders || []) {
        // التحقق من وجود قيود محاسبية للطلب
        const { data: existingEntries } = await supabase
          .from('account_entries')
          .select('id')
          .eq('reference_type', 'طلب')
          .eq('reference_id', order.id);

        if (!existingEntries || existingEntries.length === 0) {
          // سيتم إضافة القيود تلقائياً عبر الـ triggers المحدثة
          fixedCount++;
        }
      }

      toast({
        title: "تم الإصلاح",
        description: `تم فحص ${fixedCount} طلب`,
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

  // تصفير جميع الحسابات
  const handleResetAllAccounts = async () => {
    try {
      // حذف جميع القيود المحاسبية
      const { error: entriesError } = await supabase
        .from('account_entries')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // حذف جميع السجلات

      if (entriesError) {
        console.error('Error deleting account entries:', entriesError);
        toast({
          title: "خطأ",
          description: "حدث خطأ في حذف القيود المحاسبية",
          variant: "destructive",
        });
        return;
      }

      // تصفير أرصدة جميع الحسابات
      const { error: accountsError } = await supabase
        .from('accounts')
        .update({ balance: 0 })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (accountsError) {
        console.error('Error resetting account balances:', accountsError);
        toast({
          title: "خطأ",
          description: "حدث خطأ في تصفير أرصدة الحسابات",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "تم التصفير",
        description: "تم تصفير جميع الحسابات والقيود المحاسبية بنجاح",
        variant: "default",
      });

      // تحديث البيانات
      refreshAllData();
    } catch (error) {
      console.error('Error resetting accounts:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تصفير الحسابات",
        variant: "destructive",
      });
    }
  };

  // تصفير العملاء المدينون
  const handleResetDebtors = async () => {
    try {
      // حذف جميع المدفوعات
      const { error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (paymentsError) {
        console.error('Error deleting payments:', paymentsError);
        toast({
          title: "خطأ", 
          description: "حدث خطأ في حذف المدفوعات",
          variant: "destructive",
        });
        return;
      }

      // حذف جميع الفواتير
      const { error: invoicesError } = await supabase
        .from('invoices')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (invoicesError) {
        console.error('Error deleting invoices:', invoicesError);
        toast({
          title: "خطأ",
          description: "حدث خطأ في حذف الفواتير",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "تم التصفير",
        description: "تم تصفير جميع بيانات العملاء المدينون بنجاح",
        variant: "default",
      });

      // تحديث البيانات
      refreshAllData();
    } catch (error) {
      console.error('Error resetting debtors:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تصفير العملاء المدينون",
        variant: "destructive",
      });
    }
  };

  // حذف عميل مدين محدد
  const handleDeleteDebtor = async (customerId: string, customerName: string) => {
    try {
      // حذف جميع المدفوعات المرتبطة بطلبات العميل
      const { data: customerOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('customer_id', customerId);

      if (customerOrders && customerOrders.length > 0) {
        const orderIds = customerOrders.map(order => order.id);
        
        const { error: paymentsError } = await supabase
          .from('payments')
          .delete()
          .in('order_id', orderIds);

        if (paymentsError) {
          console.error('Error deleting customer payments:', paymentsError);
        }
      }

      // حذف جميع الفواتير للعميل
      const { error: invoicesError } = await supabase
        .from('invoices')
        .delete()
        .eq('customer_id', customerId);

      if (invoicesError) {
        console.error('Error deleting customer invoices:', invoicesError);
        toast({
          title: "خطأ",
          description: "حدث خطأ في حذف فواتير العميل",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "تم الحذف",
        description: `تم حذف جميع ديون العميل ${customerName} بنجاح`,
        variant: "default",
      });

      // تحديث البيانات
      fetchDebtorInvoices();
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting debtor:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في حذف بيانات العميل",
        variant: "destructive",
      });
    }
  };

  // حساب الإحصائيات - حساب الإيرادات من الطلبات المكتملة لتطابق الداشبورد  
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [lastMonthIncome, setLastMonthIncome] = useState(0);
  const [yearlyIncome, setYearlyIncome] = useState(0);
  const [filteredIncome, setFilteredIncome] = useState(0);
  const [filteredExpenses, setFilteredExpenses] = useState(0);

  // دالة للحصول على تواريخ بداية ونهاية الفترة
  const getDateRange = (period: string, startDate?: string, endDate?: string) => {
    const now = new Date();
    let start: Date, end: Date;

    switch (period) {
      case 'current_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case 'current_year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      case 'custom':
        if (startDate && endDate) {
          start = new Date(startDate);
          end = new Date(endDate + 'T23:59:59');
        } else {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        }
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    return { start, end };
  };

  // جلب الإيرادات الشهرية من المدفوعات (لتطابق التقارير)
  const fetchMonthlyRevenue = async () => {
    try {
      // الشهر الحالي - حساب من المدفوعات
      const currentMonthRange = getDateRange('current_month');
      const { data: currentPayments, error: currentError } = await supabase
        .from('payments')
        .select('amount, payment_date, payment_type')
        .gte('payment_date', currentMonthRange.start.toISOString().split('T')[0])
        .lte('payment_date', currentMonthRange.end.toISOString().split('T')[0]);

      if (currentError) {
        console.error('Error fetching current month payments:', currentError);
      } else {
        const revenue = (currentPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
        setMonthlyIncome(revenue);
      }

      // الشهر الماضي - حساب من المدفوعات
      const lastMonthRange = getDateRange('last_month');
      const { data: lastPayments, error: lastError } = await supabase
        .from('payments')
        .select('amount, payment_date, payment_type')
        .gte('payment_date', lastMonthRange.start.toISOString().split('T')[0])
        .lte('payment_date', lastMonthRange.end.toISOString().split('T')[0]);

      if (lastError) {
        console.error('Error fetching last month payments:', lastError);
      } else {
        const revenue = (lastPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
        setLastMonthIncome(revenue);
      }

      // السنة الحالية - حساب من المدفوعات  
      const yearlyRange = getDateRange('current_year');
      const { data: yearlyPayments, error: yearlyError } = await supabase
        .from('payments')
        .select('amount, payment_date, payment_type')
        .gte('payment_date', yearlyRange.start.toISOString().split('T')[0])
        .lte('payment_date', yearlyRange.end.toISOString().split('T')[0]);

      if (yearlyError) {
        console.error('Error fetching yearly payments:', yearlyError);
      } else {
        const revenue = (yearlyPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
        setYearlyIncome(revenue);
      }

      // الفترة المحددة
      fetchFilteredData();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // جلب البيانات المفلترة حسب الفترة المحددة (من المدفوعات لتطابق التقارير)
  const fetchFilteredData = async () => {
    try {
      const { start, end } = getDateRange(dateFilter.period, dateFilter.startDate, dateFilter.endDate);

      // جلب الإيرادات للفترة المحددة من المدفوعات
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, payment_date, payment_type')
        .gte('payment_date', start.toISOString().split('T')[0])
        .lte('payment_date', end.toISOString().split('T')[0]);

      if (paymentsError) {
        console.error('Error fetching filtered payments:', paymentsError);
      } else {
        const revenue = (paymentsData || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
        setFilteredIncome(revenue);
      }

      // جلب المصروفات للفترة المحددة
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('amount, expense_date')
        .gte('expense_date', start.toISOString().split('T')[0])
        .lte('expense_date', end.toISOString().split('T')[0]);

      if (expensesError) {
        console.error('Error fetching filtered expenses:', expensesError);
      } else {
        const totalExpenses = (expensesData || []).reduce((sum, expense) => sum + (expense.amount || 0), 0);
        setFilteredExpenses(totalExpenses);
      }
    } catch (error) {
      console.error('Error fetching filtered data:', error);
    }
  };

  const monthlyExpenses = (expenses || [])
    .filter(expense => {
      if (!expense.expense_date) return false;
      const expenseDate = new Date(expense.expense_date);
      const currentMonth = new Date();
      return expenseDate.getMonth() === currentMonth.getMonth() && 
             expenseDate.getFullYear() === currentMonth.getFullYear();
    })
    .reduce((sum, expense) => sum + (expense.amount || 0), 0);

  const netProfit = (monthlyIncome || 0) - (monthlyExpenses || 0);
  const filteredNetProfit = (filteredIncome || 0) - (filteredExpenses || 0);

  // تجميع الحسابات حسب النوع
  const accountsByType = accounts.reduce((acc: Record<string, any[]>, account) => {
    if (!acc[account.account_type]) {
      acc[account.account_type] = [];
    }
    acc[account.account_type].push(account);
    return acc;
  }, {});

  // حساب إجمالي المبالغ المستحقة من العملاء المدينين (من الطلبات)
  const totalDebts = debtorInvoices.reduce((sum, customer) => {
    return sum + (customer.remaining_amount || 0);
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
            <>
              <Button 
                variant="outline" 
                onClick={handleFixAccountingEntries}
                className="gap-2"
              >
                <BookOpen className="h-4 w-4" />
                إصلاح قيود الطلبات
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <Eraser className="h-4 w-4" />
                    تصفير الحسابات
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      تأكيد تصفير الحسابات
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      تحذير: هذا الإجراء سيقوم بحذف جميع القيود المحاسبية وتصفير أرصدة جميع الحسابات. لا يمكن التراجع عن هذا الإجراء.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleResetAllAccounts}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      تصفير الحسابات
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الإيرادات الشهرية</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{(monthlyIncome || 0).toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">هذا الشهر</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الشهر الماضي</CardTitle>
            <TrendingUp className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{(lastMonthIncome || 0).toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">إيرادات الشهر الماضي</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المصروفات الشهرية</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{(monthlyExpenses || 0).toLocaleString()} ر.س</div>
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
              {(netProfit || 0).toLocaleString()} ر.س
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
            <div className="text-2xl font-bold text-warning">{(totalDebts || 0).toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">{debtorInvoices.length} عميل مدين</p>
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

      {/* فلاتر زمنية للتقارير */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5" />
            فلتر التقارير الزمنية
          </CardTitle>
          <CardDescription>اعرض التقارير المالية حسب فترة زمنية محددة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label htmlFor="period">الفترة الزمنية</Label>
              <Select value={dateFilter.period} onValueChange={(value) => setDateFilter({...dateFilter, period: value})}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="اختر الفترة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_month">الشهر الحالي</SelectItem>
                  <SelectItem value="last_month">الشهر الماضي</SelectItem>
                  <SelectItem value="current_year">السنة الحالية</SelectItem>
                  <SelectItem value="custom">فترة مخصصة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {dateFilter.period === 'custom' && (
              <>
                <div>
                  <Label htmlFor="startDate">من تاريخ</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={dateFilter.startDate}
                    onChange={(e) => setDateFilter({...dateFilter, startDate: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">إلى تاريخ</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={dateFilter.endDate}
                    onChange={(e) => setDateFilter({...dateFilter, endDate: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </>
            )}
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={fetchFilteredData}
                className="gap-2 mt-1"
              >
                <Search className="h-4 w-4" />
                تطبيق الفلتر
              </Button>
            </div>
          </div>

          {/* عرض نتائج الفلتر */}
          <div className="grid gap-4 md:grid-cols-3 mt-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  إيرادات الفترة المحددة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {(filteredIncome || 0).toLocaleString()} ر.س
                </div>
                <p className="text-xs text-muted-foreground">
                  {dateFilter.period === 'current_month' && 'الشهر الحالي'}
                  {dateFilter.period === 'last_month' && 'الشهر الماضي'}
                  {dateFilter.period === 'current_year' && 'السنة الحالية'}
                  {dateFilter.period === 'custom' && 'الفترة المخصصة'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  مصروفات الفترة المحددة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {(filteredExpenses || 0).toLocaleString()} ر.س
                </div>
                <p className="text-xs text-muted-foreground">
                  {dateFilter.period === 'current_month' && 'الشهر الحالي'}
                  {dateFilter.period === 'last_month' && 'الشهر الماضي'}
                  {dateFilter.period === 'current_year' && 'السنة الحالية'}
                  {dateFilter.period === 'custom' && 'الفترة المخصصة'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  صافي ربح الفترة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${filteredNetProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {(filteredNetProfit || 0).toLocaleString()} ر.س
                </div>
                <p className="text-xs text-muted-foreground">
                  {filteredNetProfit >= 0 ? 'ربح' : 'خسارة'}
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

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
                  {(accountList as any[]).map((account) => {
                    // تحديد كيفية عرض الرصيد حسب نوع الحساب
                    const isRevenueAccount = account.account_type === 'إيرادات';
                    const isExpenseAccount = account.account_type === 'مصروفات';
                    
                    // للحسابات الإيرادية: عرض الرقم موجب مع وصف
                    const displayBalance = isRevenueAccount ? Math.abs(account.balance) : account.balance;
                    const balanceLabel = isRevenueAccount 
                      ? 'الإيرادات المحققة' 
                      : isExpenseAccount 
                        ? 'إجمالي المصروفات'
                        : 'الرصيد الحالي';
                    
                    // تحديد لون الرصيد
                    const balanceColor = isRevenueAccount 
                      ? 'text-success' 
                      : isExpenseAccount
                        ? 'text-destructive'
                        : account.balance >= 0 
                          ? 'text-success' 
                          : 'text-destructive';

                    return (
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
                            <p className={`text-lg font-bold ${balanceColor}`}>
                              {displayBalance?.toLocaleString()} ر.س
                            </p>
                            <p className="text-xs text-muted-foreground">{balanceLabel}</p>
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
                    );
                  })}
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
                         type="text"
                         value={newEntry.debit_amount}
                         onChange={(e) => setNewEntry({...newEntry, debit_amount: e.target.value})}
                         placeholder="0.00"
                       />
                    </div>
                    <div>
                      <Label htmlFor="credit_amount">المبلغ الدائن</Label>
                       <Input
                         id="credit_amount"
                         type="text"
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
                        {entry.debit > 0 && (
                          <div>
                            <p className="text-sm text-muted-foreground">مدين</p>
                            <p className="font-bold text-red-600">+{entry.debit?.toLocaleString()} ر.س</p>
                          </div>
                        )}
                        {entry.credit > 0 && (
                          <div>
                            <p className="text-sm text-muted-foreground">دائن</p>
                            <p className="font-bold text-green-600">-{entry.credit?.toLocaleString()} ر.س</p>
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
                         type="text"
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
                      <Label htmlFor="expense_date">التاريخ</Label>
                      <Input
                        id="expense_date"
                        type="date"
                        value={newExpense.expense_date}
                        onChange={(e) => setNewExpense({...newExpense, expense_date: e.target.value})}
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
                        <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
                        <SelectItem value="الشبكة">الشبكة</SelectItem>
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
                        <p className="text-sm text-muted-foreground">{expense.expense_type} • {new Date(expense.expense_date).toLocaleDateString('ar-SA')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-lg text-destructive">-{expense.amount?.toLocaleString()} ر.س</p>
                        <p className="text-sm text-muted-foreground">{new Date(expense.expense_date).toLocaleDateString('ar-SA')}</p>
                      </div>
                      {userRole === 'admin' && (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setEditingExpense(expense);
                              setIsEditExpenseOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
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
                                  هل أنت متأكد من حذف المصروف "{expense.description}"؟
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
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
            <div className="flex items-center gap-4">
              {userRole === 'admin' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="gap-2 text-destructive hover:text-destructive"
                      size="sm"
                    >
                      <Eraser className="h-4 w-4" />
                      تصفير العملاء المدينون
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        تأكيد تصفير العملاء المدينون
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        تحذير: هذا الإجراء سيقوم بحذف جميع الفواتير والمدفوعات المرتبطة بالعملاء المدينون. لا يمكن التراجع عن هذا الإجراء.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleResetDebtors}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        تصفير العملاء المدينون
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <div className="text-sm text-muted-foreground">
                إجمالي المبالغ المستحقة: <span className="font-bold text-warning">{(totalDebts || 0).toLocaleString()} ر.س</span>
              </div>
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
                        <SelectItem value="debtor">مدين</SelectItem>
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
                <Button 
                  variant="outline" 
                  onClick={exportDebtorsToPDF}
                  className="gap-2"
                  disabled={debtorInvoices.length === 0}
                >
                  <Download className="h-4 w-4" />
                  تصدير PDF
                </Button>
                <Button 
                  variant="outline" 
                  onClick={exportDebtorsToExcel}
                  className="gap-2"
                  disabled={debtorInvoices.length === 0}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  تصدير Excel
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
                  <p>لا توجد طلبات مستحقة حالياً</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {debtorInvoices.map((customer) => {
                    const remainingAmount = customer.remaining_amount || 0;
                    const totalAmount = customer.total_amount || 0;
                    const paidAmount = customer.calculated_paid_amount || 0;
                    
                    return (
                      <div key={customer.id || customer.customer_id} className="flex items-center justify-between p-4 border-b hover:bg-muted/50">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
                            <Receipt className="h-6 w-6 text-warning" />
                          </div>
                          <div>
                            <h3 className="font-medium">{customer.customer_name || 'عميل غير محدد'}</h3>
                            <p className="text-sm text-muted-foreground">
                              عدد الطلبات: {customer.total_orders || 0}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex flex-col gap-1">
                            <Badge variant={remainingAmount > 0 ? 'destructive' : 'secondary'}>
                              {remainingAmount > 0 ? 'مدين' : 'مدفوع'}
                            </Badge>
                            <p className="font-bold text-lg text-warning">
                              {remainingAmount.toLocaleString()} ر.س
                            </p>
                            <p className="text-sm text-muted-foreground">
                              من أصل {totalAmount.toLocaleString()} ر.س
                            </p>
                            {paidAmount > 0 && (
                              <p className="text-sm text-success">
                                مدفوع: {paidAmount.toLocaleString()} ر.س
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => {
                            toast({
                              title: "معلومات العميل",
                              description: `العميل: ${customer.customer_name} - إجمالي الديون: ${remainingAmount.toLocaleString()} ر.س`,
                            });
                          }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {userRole === 'admin' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                    تأكيد حذف بيانات العميل
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    هل أنت متأكد من حذف جميع الفواتير والديون المرتبطة بالعميل "{customer.customer_name}"؟ 
                                    لا يمكن التراجع عن هذا الإجراء.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteDebtor(customer.customer_id, customer.customer_name)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    حذف بيانات العميل
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
                <CardTitle className="text-sm font-medium">عدد الطلبات المستحقة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{debtorInvoices.length}</div>
                <p className="text-xs text-muted-foreground">طلب غير مسدد</p>
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
                <p className="text-xs text-muted-foreground">لكل طلب</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">الطلبات المتأخرة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {debtorInvoices.filter(customer => 
                    customer.latest_due_date && new Date(customer.latest_due_date) < new Date()
                  ).length}
                </div>
                <p className="text-xs text-muted-foreground">طلب متأخر الدفع</p>
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
                <CardDescription>
                  {dateFilter.period === 'current_month' && 'الشهر الحالي'}
                  {dateFilter.period === 'last_month' && 'الشهر الماضي'}
                  {dateFilter.period === 'current_year' && 'السنة الحالية'}
                  {dateFilter.period === 'custom' && 'الفترة المخصصة'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="font-medium text-success">الإيرادات</span>
                    <span className="font-bold text-success">{(filteredIncome || 0).toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="font-medium text-destructive">المصروفات</span>
                    <span className="font-bold text-destructive">{(filteredExpenses || 0).toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-gray-300">
                    <span className="font-bold">صافي الربح</span>
                    <span className={`font-bold text-lg ${filteredNetProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {(filteredNetProfit || 0).toLocaleString()} ر.س
                    </span>
                  </div>
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <h5 className="font-medium mb-2">مقارنة مع الفترات الأخرى:</h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>إيرادات هذا الشهر:</span>
                        <span className="text-success font-medium">{monthlyIncome.toLocaleString()} ر.س</span>
                      </div>
                      <div className="flex justify-between">
                        <span>إيرادات الشهر الماضي:</span>
                        <span className="text-info font-medium">{lastMonthIncome.toLocaleString()} ر.س</span>
                      </div>
                      <div className="flex justify-between">
                        <span>إيرادات السنة الحالية:</span>
                        <span className="text-primary font-medium">{yearlyIncome.toLocaleString()} ر.س</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* حوار تعديل المصروف */}
      <Dialog open={isEditExpenseOpen} onOpenChange={setIsEditExpenseOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تعديل المصروف</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="edit_description">الوصف</Label>
              <Input
                id="edit_description"
                value={editingExpense?.description || ''}
                onChange={(e) => setEditingExpense({...editingExpense, description: e.target.value})}
                placeholder="وصف المصروف..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_amount">المبلغ</Label>
                 <Input
                   id="edit_amount"
                   type="text"
                   value={editingExpense?.amount || ''}
                   onChange={(e) => setEditingExpense({...editingExpense, amount: e.target.value})}
                   placeholder="0.00"
                 />
              </div>
              <div>
                <Label htmlFor="edit_category">الفئة</Label>
                <Select value={editingExpense?.expense_type || editingExpense?.category || ''} onValueChange={(value) => setEditingExpense({...editingExpense, expense_type: value, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="مكتبية">مصروفات مكتبية</SelectItem>
                    <SelectItem value="تشغيلية">مصروفات تشغيلية</SelectItem>
                    <SelectItem value="تسويق">تسويق وإعلان</SelectItem>
                    <SelectItem value="صيانة">صيانة وإصلاح</SelectItem>
                    <SelectItem value="مواصلات">مواصلات</SelectItem>
                    <SelectItem value="رواتب">رواتب</SelectItem>
                    <SelectItem value="كهرباء وماء">كهرباء وماء</SelectItem>
                    <SelectItem value="أخرى">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_expense_date">التاريخ</Label>
                <Input
                  id="edit_expense_date"
                  type="date"
                  value={editingExpense?.expense_date || ''}
                  onChange={(e) => setEditingExpense({...editingExpense, expense_date: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit_payment_method">طريقة الدفع</Label>
                <Select value={editingExpense?.payment_method || ''} onValueChange={(value) => setEditingExpense({...editingExpense, payment_method: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر طريقة الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="نقدي">نقدي</SelectItem>
                    <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
                    <SelectItem value="الشبكة">الشبكة</SelectItem>
                    <SelectItem value="شيك">شيك</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit_notes">ملاحظات</Label>
              <Textarea
                id="edit_notes"
                value={editingExpense?.notes || ''}
                onChange={(e) => setEditingExpense({...editingExpense, notes: e.target.value})}
                placeholder="ملاحظات إضافية..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsEditExpenseOpen(false);
                setEditingExpense(null);
              }}>
                إلغاء
              </Button>
              <Button onClick={handleEditExpense}>
                حفظ التعديلات
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Accounts;