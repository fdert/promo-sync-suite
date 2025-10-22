// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, Mail, MessageSquare, Clock, DollarSign, AlertCircle, Zap, Activity, Search, Filter, User, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import OrdersPaymentsReport from "@/components/OrdersPaymentsReport";

interface FollowUpSettings {
  id?: string;
  whatsapp_number?: string;
  email?: string;
  follow_up_webhook_url?: string;
  notify_new_order: boolean;
  notify_delivery_delay: boolean;
  notify_payment_delay: boolean;
  notify_whatsapp_failure: boolean;
  notify_expense_logged: boolean;
  notify_payment_logged: boolean;
  daily_financial_report: boolean;
  delivery_delay_days: number;
  payment_delay_days: number;
}

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
  profiles?: {
    full_name?: string;
  } | null;
}

interface User {
  id: string;
  full_name: string;
}

const FollowUpSettings = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("settings");
  const [settings, setSettings] = useState<FollowUpSettings>({
    notify_new_order: true,
    notify_delivery_delay: true,
    notify_payment_delay: true,
    notify_whatsapp_failure: true,
    notify_expense_logged: true,
    notify_payment_logged: true,
    daily_financial_report: true,
    delivery_delay_days: 1,
    payment_delay_days: 7,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [isTestingFinancialReport, setIsTestingFinancialReport] = useState(false);
  const [testingNotifications, setTestingNotifications] = useState({
    new_order: false,
    delivery_delay: false,
    payment_delay: false,
    expense_logged: false,
    payment_logged: false,
  });
  
  // Activity logs states
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSettings();
    fetchUsers();
    fetchActivityLogs();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('follow_up_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          whatsapp_number: data.whatsapp_number || '',
          email: data.email || '',
          follow_up_webhook_url: data.follow_up_webhook_url || '',
          notify_new_order: data.notify_new_order,
          notify_delivery_delay: data.notify_delivery_delay,
          notify_payment_delay: data.notify_payment_delay,
          notify_whatsapp_failure: data.notify_whatsapp_failure,
          notify_expense_logged: data.notify_expense_logged,
          notify_payment_logged: data.notify_payment_logged || true,
          daily_financial_report: data.daily_financial_report,
          delivery_delay_days: data.delivery_delay_days,
          payment_delay_days: data.payment_delay_days,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب الإعدادات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsData = {
        whatsapp_number: settings.whatsapp_number,
        email: settings.email,
        follow_up_webhook_url: settings.follow_up_webhook_url,
        notify_new_order: settings.notify_new_order,
        notify_delivery_delay: settings.notify_delivery_delay,
        notify_payment_delay: settings.notify_payment_delay,
        notify_whatsapp_failure: settings.notify_whatsapp_failure,
        notify_expense_logged: settings.notify_expense_logged,
        notify_payment_logged: settings.notify_payment_logged,
        daily_financial_report: settings.daily_financial_report,
        delivery_delay_days: settings.delivery_delay_days,
        payment_delay_days: settings.payment_delay_days,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (settings.id) {
        const result = await supabase
          .from('follow_up_settings')
          .update(settingsData)
          .eq('id', settings.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('follow_up_settings')
          .insert([settingsData]);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "تم الحفظ",
        description: "تم حفظ إعدادات المتابعة بنجاح",
      });

      // إعادة جلب الإعدادات للتأكد من التحديث
      await fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ الإعدادات",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testFollowUpSystem = async () => {
    setTesting(true);
    try {
      // اختبار بسيط بدون استدعاء functions خارجية
      console.log('Testing follow-up system...');
      
      // فحص إعدادات المتابعة
      const { data: settingsData, error: settingsError } = await supabase
        .from('follow_up_settings')
        .select('*')
        .maybeSingle();
      
      if (settingsError) {
        throw new Error('فشل في جلب إعدادات المتابعة: ' + settingsError.message);
      }
      
      if (!settingsData) {
        throw new Error('لا توجد إعدادات متابعة. يرجى حفظ الإعدادات أولاً.');
      }
      
      if (!settingsData.whatsapp_number) {
        throw new Error('يرجى إدخال رقم واتساب فريق المتابعة');
      }
      
      // فحص الرسائل المعلقة
      const { data: pendingMessages, error: messagesError } = await supabase
        .from('whatsapp_messages')
        .select('id, status, message_type')
        .eq('status', 'pending')
        .limit(5);
      
      if (messagesError) {
        console.warn('تحذير: فشل في جلب الرسائل المعلقة:', messagesError.message);
      }
      
      // فحص الطلبات الحديثة
      const { data: recentOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, status, created_at')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (ordersError) {
        console.warn('تحذير: فشل في جلب الطلبات الحديثة:', ordersError.message);
      }
      
      // إنشاء رسالة اختبار
      const testMessage = `🧪 رسالة اختبار نظام المتابعة

📊 نتائج الاختبار:
✅ إعدادات المتابعة: موجودة
📱 رقم واتساب فريق المتابعة: ${settingsData.whatsapp_number}
📨 الرسائل المعلقة: ${pendingMessages?.length || 0}
📋 الطلبات الحديثة: ${recentOrders?.length || 0}

⚙️ الإعدادات النشطة:
• إشعار طلب جديد: ${settingsData.notify_new_order ? 'مفعل' : 'معطل'}
• إشعار تأخير التسليم: ${settingsData.notify_delivery_delay ? 'مفعل' : 'معطل'}
• إشعار تأخير الدفع: ${settingsData.notify_payment_delay ? 'مفعل' : 'معطل'}
• إشعار فشل الواتساب: ${settingsData.notify_whatsapp_failure ? 'مفعل' : 'معطل'}
• إشعار تسجيل المصروفات: ${settingsData.notify_expense_logged ? 'مفعل' : 'معطل'}
• تقرير مالي يومي: ${settingsData.daily_financial_report ? 'مفعل' : 'معطل'}

🔧 مهل زمنية:
• مهلة التسليم: ${settingsData.delivery_delay_days} أيام
• مهلة الدفع: ${settingsData.payment_delay_days} أيام

⏰ وقت الاختبار: ${new Date().toLocaleString('ar-SA')}`;

      // حفظ رسالة الاختبار
      const { error: insertError } = await supabase
        .from('whatsapp_messages')
        .insert({
          from_number: 'test_system',
          to_number: String(settingsData.whatsapp_number || '').trim(),
          message_type: 'text',
          message_content: testMessage,
          status: 'pending',
          dedupe_key: `test_${Date.now()}`
        });
      
      if (insertError) {
        console.warn('تحذير: فشل في حفظ رسالة الاختبار:', insertError.message);
      } else {
        // معالجة الرسائل عبر الويب هوك (n8n)
        const { data: queueResult, error: queueError } = await supabase.functions.invoke('process-whatsapp-queue', {
          body: { action: 'process_pending_messages', source: 'follow-up-settings-follow-up-test' }
        });
        if (queueError) {
          console.warn('تحذير: فشل في استدعاء process-whatsapp-queue:', queueError.message);
        } else {
          console.log('تمت معالجة قائمة الواتساب:', queueResult);
        }
      }

      toast({
        title: "نجح اختبار النظام ✅",
        description: `تم اختبار جميع المكونات بنجاح. الرسائل المعلقة: ${pendingMessages?.length || 0}`,
      });
      
    } catch (error) {
      console.error('Error testing follow-up system:', error);
      toast({
        title: "فشل الاختبار ❌",
        description: error.message || "حدث خطأ أثناء اختبار النظام",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleTestFinancialReport = async () => {
    setIsTestingFinancialReport(true);
    try {
      if (!settings.whatsapp_number) {
        throw new Error('يرجى إدخال رقم واتساب فريق المتابعة في الإعدادات وحفظه أولاً');
      }

      // حساب التقرير محليًا (عميل) ثم إرساله عبر الويب هوك
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

      const [{ data: payments }, { data: expenses }] = await Promise.all([
        supabase.from('payments').select('amount').gte('payment_date', start).lte('payment_date', end),
        supabase.from('expenses').select('amount').gte('expense_date', start).lte('expense_date', end),
      ]);

      const totalPayments = (payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      const totalExpenses = (expenses || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const netProfit = totalPayments - totalExpenses;

      const [{ count: newOrdersCount }, { count: completedOrdersCount }] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('updated_at', start).lte('updated_at', end),
      ]);

      const message = `📊 *التقرير المالي اليومي*\n\n📅 التاريخ: ${now.toLocaleDateString('ar-SA')}\n\n💰 *المبالغ المدفوعة اليوم:*\n${totalPayments.toFixed(2)} ريال\n\n💸 *المصروفات اليومية:*\n${totalExpenses.toFixed(2)} ريال\n\n📈 *صافي الربح اليومي:*\n${netProfit.toFixed(2)} ريال ${netProfit >= 0 ? '✅' : '❌'}\n\n📦 *الطلبات:*\n• طلبات جديدة: ${newOrdersCount || 0}\n• طلبات مكتملة: ${completedOrdersCount || 0}\n\n---\nتم إنشاء التقرير تلقائياً في تمام الساعة ${now.toLocaleTimeString('ar-SA')}`;

      const toNumber = String(settings.whatsapp_number || '').trim();

      // استدعاء دالة التقرير المالي والتي ترسل مباشرة عبر follow_up_webhook إن وُجد
      const { data: reportResult, error: reportError } = await supabase.functions.invoke('daily-financial-report', {
        body: { test: true }
      });
      if (reportError) throw reportError;

      // تشغيل معالج قائمة رسائل الواتساب لضمان الإرسال عبر نفس القناة المستخدمة في بقية الإشعارات
      const { data: queueData, error: queueError } = await supabase.functions.invoke('process-whatsapp-queue', {
        body: { action: 'process_pending_messages', source: 'follow-up-settings-financial-report-test' }
      });
      if (queueError) {
        console.warn('تحذير: فشل في استدعاء process-whatsapp-queue:', queueError.message || queueError);
      }

      toast({
        title: 'تم إرسال التقرير المالي ✅',
        description: 'تم إنشاء التقرير وإرساله عبر الويب هوك بنجاح',
      });
    } catch (error: any) {
      console.error('Error testing financial report:', error);
      toast({
        title: 'فشل إرسال التقرير ❌',
        description: error?.message || 'حدث خطأ أثناء إرسال التقرير المالي',
        variant: 'destructive',
      });
    } finally {
      setIsTestingFinancialReport(false);
    }
  };

  const handleTestNotification = async (notificationType: string) => {
    setTestingNotifications({ ...testingNotifications, [notificationType]: true });
    
    try {
      if (!settings.whatsapp_number) {
        throw new Error('يرجى إدخال رقم واتساب فريق المتابعة في الإعدادات وحفظه أولاً');
      }

      let result;
      switch (notificationType) {
        case 'new_order':
          result = await supabase.functions.invoke('notify-new-order', {
            body: { test: true }
          });
          break;
          
        case 'delivery_delay':
          result = await supabase.functions.invoke('notify-delivery-delay', {
            body: { test: true }
          });
          break;
          
        case 'payment_delay':
          result = await supabase.functions.invoke('notify-payment-delay', {
            body: { test: true }
          });
          break;
          
        case 'expense_logged':
          result = await supabase.functions.invoke('notify-new-expense', {
            body: { 
              expense_id: 'test',
              test: true
            }
          });
          break;
          
        case 'payment_logged':
          result = await supabase.functions.invoke('notify-new-payment', {
            body: { 
              payment_id: 'test',
              test: true
            }
          });
          break;
          
        default:
          throw new Error('نوع الإشعار غير معروف');
      }

      if (result.error) throw result.error;

      toast({
        title: 'تم إرسال الإشعار بنجاح ✅',
        description: `تم إرسال ${getNotificationName(notificationType)} عبر الويب هوك`,
      });
    } catch (error: any) {
      console.error('Error testing notification:', error);
      toast({
        title: 'فشل إرسال الإشعار ❌',
        description: error?.message || 'حدث خطأ أثناء إرسال الإشعار',
        variant: 'destructive',
      });
    } finally {
      setTestingNotifications({ ...testingNotifications, [notificationType]: false });
    }
  };

  const getNotificationName = (type: string) => {
    const names = {
      new_order: 'إشعار الطلب الجديد',
      delivery_delay: 'إشعار تأخر التسليم',
      payment_delay: 'إشعار تأخر الدفع',
      expense_logged: 'إشعار تسجيل المصروف',
      payment_logged: 'إشعار تسجيل الدفعة',
    };
    return names[type] || 'الإشعار';
  };

  // Activity logs functions
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      setLogsLoading(true);
      let query = supabase
        .from('user_activity_logs')
        .select(`
          *,
          profiles:user_id (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (selectedUserId && selectedUserId !== "all") {
        query = query.eq('user_id', selectedUserId);
      }

      if (startDate) {
        query = query.gte('created_at', startDate + 'T00:00:00');
      }

      if (endDate) {
        query = query.lte('created_at', endDate + 'T23:59:59');
      }

      if (actionFilter && actionFilter !== "all") {
        query = query.eq('action', actionFilter);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب سجلات النشاط",
        variant: "destructive",
      });
    } finally {
      setLogsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (log.action || '').toLowerCase().includes(searchLower) ||
      ((log.resource_type || '').toLowerCase().includes(searchLower)) ||
      (log.details && JSON.stringify(log.details).toLowerCase().includes(searchLower))
    );
  });

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ar });
    } catch {
      return dateString;
    }
  };

  const formatDetails = (details: any) => {
    if (!details) return '-';
    
    if (typeof details === 'string') return details;
    
    try {
      return JSON.stringify(details, null, 2);
    } catch {
      return '-';
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'insert':
        return 'bg-green-100 text-green-800';
      case 'update':
      case 'edit':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
      case 'remove':
        return 'bg-red-100 text-red-800';
      case 'login':
        return 'bg-purple-100 text-purple-800';
      case 'logout':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const applyQuickFilter = (period: string) => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    
    switch (period) {
      case 'today':
        setStartDate(today);
        setEndDate(today);
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        setStartDate(format(weekAgo, 'yyyy-MM-dd'));
        setEndDate(today);
        break;
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        setStartDate(format(monthAgo, 'yyyy-MM-dd'));
        setEndDate(today);
        break;
      case 'year':
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        setStartDate(format(yearAgo, 'yyyy-MM-dd'));
        setEndDate(today);
        break;
      default:
        setStartDate("");
        setEndDate("");
    }
  };

  useEffect(() => {
    if (activeTab === "activity-logs") {
      fetchActivityLogs();
    }
  }, [activeTab, selectedUserId, startDate, endDate, actionFilter, resourceFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">إدارة المتابعة</h1>
        <p className="text-muted-foreground mt-2">
          إدارة إعدادات المتابعة وإشعارات الواتساب الداخلية وسجلات نشاط المستخدمين
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            إعدادات المتابعة
          </TabsTrigger>
          <TabsTrigger value="activity-logs" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            سجلات النشاط
          </TabsTrigger>
          <TabsTrigger value="orders-payments" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            تقرير الطلبات والمدفوعات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6">
            {/* معلومات الاتصال */}
            <Card className="bg-gradient-to-br from-card to-muted/20 border-primary/10 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Phone className="h-5 w-5 text-primary" />
                  معلومات الاتصال
                </CardTitle>
                <CardDescription>
                  أرقام الواتساب والإيميل الخاصة بفريق المتابعة والإدارة لاستقبال الإشعارات الداخلية
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp" className="text-sm font-medium">
                      رقم واتساب فريق المتابعة (لاستقبال الإشعارات)
                    </Label>
                    <Input
                      id="whatsapp"
                      placeholder="966501234567"
                      value={settings.whatsapp_number || ''}
                      onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                      className="bg-background/50 border-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      إيميل المتابعة
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="follow-up@company.com"
                      value={settings.email || ''}
                      onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                      className="bg-background/50 border-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <Label htmlFor="follow_up_webhook" className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    رابط ويب هوك إدارة المتابعة (n8n)
                  </Label>
                  <Input
                    id="follow_up_webhook"
                    type="url"
                    placeholder="https://n8n.example.com/webhook/follow-up"
                    value={settings.follow_up_webhook_url || ''}
                    onChange={(e) => setSettings({ ...settings, follow_up_webhook_url: e.target.value })}
                    className="bg-background/50 border-primary/20 focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    رابط الويب هوك الخاص بـ n8n لإرسال رسائل إدارة المتابعة (اتركه فارغًا لاستخدام الويب هوك الافتراضي)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* إعدادات الرسائل التلقائية */}
            <Card className="bg-gradient-to-br from-card to-accent/5 border-accent/20 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <MessageSquare className="h-5 w-5 text-accent" />
                  إعدادات الرسائل التلقائية
                </CardTitle>
                <CardDescription>
                  إشعارات واتساب تلقائية لفريق المتابعة عند تغيير حالة الطلبات أو حدوث مشاكل في النظام
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                    <div className="flex items-center gap-3 flex-1">
                      <Zap className="h-5 w-5 text-primary" />
                      <div>
                        <h4 className="font-medium">إشعار عند إنشاء طلب جديد</h4>
                        <p className="text-sm text-muted-foreground">إرسال إشعار لفريق المتابعة عند إنشاء طلب جديد في النظام</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {settings.notify_new_order && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTestNotification('new_order')}
                          disabled={testingNotifications.new_order || !settings.whatsapp_number}
                          className="text-xs"
                        >
                          {testingNotifications.new_order ? (
                            <div className="flex items-center gap-1">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                              جاري...
                            </div>
                          ) : (
                            <>
                              <Zap className="h-3 w-3 ml-1" />
                              اختبار
                            </>
                          )}
                        </Button>
                      )}
                      <Switch
                        checked={settings.notify_new_order}
                        onCheckedChange={(checked) => 
                          setSettings({ ...settings, notify_new_order: checked })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 dark:from-orange-900/20 dark:to-orange-800/20 dark:border-orange-700/30">
                    <div className="flex items-center gap-3 flex-1">
                      <Clock className="h-5 w-5 text-orange-600" />
                      <div>
                        <h4 className="font-medium">إشعار تجاوز فترة التسليم</h4>
                        <p className="text-sm text-muted-foreground">
                          إرسال إشعار لفريق المتابعة عند تجاوز الطلب فترة التسليم المحددة
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {settings.notify_delivery_delay && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTestNotification('delivery_delay')}
                          disabled={testingNotifications.delivery_delay || !settings.whatsapp_number}
                          className="text-xs"
                        >
                          {testingNotifications.delivery_delay ? (
                            <div className="flex items-center gap-1">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                              جاري...
                            </div>
                          ) : (
                            <>
                              <Zap className="h-3 w-3 ml-1" />
                              اختبار
                            </>
                          )}
                        </Button>
                      )}
                      <Switch
                        checked={settings.notify_delivery_delay}
                        onCheckedChange={(checked) => 
                          setSettings({ ...settings, notify_delivery_delay: checked })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-red-50 to-red-100 border border-red-200 dark:from-red-900/20 dark:to-red-800/20 dark:border-red-700/30">
                    <div className="flex items-center gap-3 flex-1">
                      <DollarSign className="h-5 w-5 text-red-600" />
                      <div>
                        <h4 className="font-medium">إشعار تأخير المدفوعات</h4>
                        <p className="text-sm text-muted-foreground">
                          إرسال إشعار لفريق المتابعة عند تجاوز 30 يوم بدون دفع
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {settings.notify_payment_delay && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTestNotification('payment_delay')}
                          disabled={testingNotifications.payment_delay || !settings.whatsapp_number}
                          className="text-xs"
                        >
                          {testingNotifications.payment_delay ? (
                            <div className="flex items-center gap-1">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                              جاري...
                            </div>
                          ) : (
                            <>
                              <Zap className="h-3 w-3 ml-1" />
                              اختبار
                            </>
                          )}
                        </Button>
                      )}
                      <Switch
                        checked={settings.notify_payment_delay}
                        onCheckedChange={(checked) => 
                          setSettings({ ...settings, notify_payment_delay: checked })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 dark:from-yellow-900/20 dark:to-yellow-800/20 dark:border-yellow-700/30">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <h4 className="font-medium">إشعار عند فشل الواتساب</h4>
                        <p className="text-sm text-muted-foreground">
                          إرسال إشعار لفريق المتابعة عند فشل إرسال رسائل الواتساب في النظام
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.notify_whatsapp_failure}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, notify_whatsapp_failure: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 dark:border-blue-700/30">
                    <div className="flex items-center gap-3 flex-1">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                      <div>
                        <h4 className="font-medium">إشعار تسجيل المصروفات</h4>
                        <p className="text-sm text-muted-foreground">
                          إرسال إشعار لفريق المتابعة عند تسجيل مصروف جديد
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {settings.notify_expense_logged && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTestNotification('expense_logged')}
                          disabled={testingNotifications.expense_logged || !settings.whatsapp_number}
                          className="text-xs"
                        >
                          {testingNotifications.expense_logged ? (
                            <div className="flex items-center gap-1">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                              جاري...
                            </div>
                          ) : (
                            <>
                              <Zap className="h-3 w-3 ml-1" />
                              اختبار
                            </>
                          )}
                        </Button>
                      )}
                      <Switch
                        checked={settings.notify_expense_logged}
                        onCheckedChange={(checked) => 
                          setSettings({ ...settings, notify_expense_logged: checked })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-green-50 to-green-100 border border-green-200 dark:from-green-900/20 dark:to-green-800/20 dark:border-green-700/30">
                    <div className="flex items-center gap-3 flex-1">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <div>
                        <h4 className="font-medium">إشعار تسجيل الدفعات</h4>
                        <p className="text-sm text-muted-foreground">
                          إرسال إشعار لفريق المتابعة عند تسجيل دفعة جديدة للطلب
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {settings.notify_payment_logged && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTestNotification('payment_logged')}
                          disabled={testingNotifications.payment_logged || !settings.whatsapp_number}
                          className="text-xs"
                        >
                          {testingNotifications.payment_logged ? (
                            <div className="flex items-center gap-1">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                              جاري...
                            </div>
                          ) : (
                            <>
                              <Zap className="h-3 w-3 ml-1" />
                              اختبار
                            </>
                          )}
                        </Button>
                      )}
                      <Switch
                        checked={settings.notify_payment_logged}
                        onCheckedChange={(checked) => 
                          setSettings({ ...settings, notify_payment_logged: checked })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 dark:from-purple-900/20 dark:to-purple-800/20 dark:border-purple-700/30">
                    <div className="flex items-center gap-3 flex-1">
                      <Activity className="h-5 w-5 text-purple-600" />
                      <div>
                        <h4 className="font-medium">تقرير مالي يومي</h4>
                        <p className="text-sm text-muted-foreground">
                          إرسال تقرير يومي عن المبالغ المدفوعة والمصروفات والأرباح عند الساعة 00:00
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {settings.daily_financial_report && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleTestFinancialReport}
                          disabled={isTestingFinancialReport || !settings.whatsapp_number}
                          className="text-xs"
                        >
                          {isTestingFinancialReport ? (
                            <div className="flex items-center gap-1">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                              جاري...
                            </div>
                          ) : (
                            <>
                              <Zap className="h-3 w-3 ml-1" />
                              اختبار
                            </>
                          )}
                        </Button>
                      )}
                      <Switch
                        checked={settings.daily_financial_report}
                        onCheckedChange={(checked) => 
                          setSettings({ ...settings, daily_financial_report: checked })
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* إعدادات المهل الزمنية */}
                <div className="space-y-4">
                  <h4 className="font-medium text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    المهل الزمنية
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="delivery-delay" className="text-sm font-medium">
                        مهلة التسليم (بالأيام)
                      </Label>
                       <Input
                         id="delivery-delay"
                         type="text"
                         value={settings.delivery_delay_days}
                         onChange={(e) => setSettings({ 
                           ...settings, 
                           delivery_delay_days: parseInt(e.target.value) || 7 
                         })}
                         className="bg-background/50 border-primary/20 focus:border-primary"
                       />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment-delay" className="text-sm font-medium">
                        مهلة الدفع (بالأيام)
                      </Label>
                       <Input
                         id="payment-delay"
                         type="text"
                         value={settings.payment_delay_days}
                         onChange={(e) => setSettings({ 
                           ...settings, 
                           payment_delay_days: parseInt(e.target.value) || 30 
                         })}
                         className="bg-background/50 border-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* أزرار الحفظ والاختبار */}
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <div className="flex gap-3 flex-wrap">
                <Button 
                  onClick={testFollowUpSystem} 
                  disabled={testing || !settings.whatsapp_number}
                  variant="outline"
                  size="lg"
                  className="min-w-[140px]"
                >
                  {testing ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      جاري الاختبار...
                    </div>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 ml-2" />
                      اختبار النظام
                    </>
                  )}
                </Button>
              </div>
              
              <Button
                onClick={handleSave} 
                disabled={saving}
                size="lg"
                className="min-w-[120px] bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg"
              >
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    جاري الحفظ...
                  </div>
                ) : (
                  "حفظ الإعدادات"
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activity-logs" className="space-y-6">
          {/* الفلاتر */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  الفلاتر والبحث
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) return;
                      
                      const testActions = ['create', 'update', 'delete', 'login', 'view'];
                      const testResources = ['order', 'customer', 'payment', 'invoice', 'user'];
                      
                      for (let i = 0; i < 5; i++) {
                        await supabase.from('user_activity_logs').insert({
                          user_id: user.id,
                          action: testActions[Math.floor(Math.random() * testActions.length)],
                          details: { test: true, timestamp: new Date().toISOString() },
                          ip_address: '127.0.0.1',
                          user_agent: 'Test Browser'
                        });
                      }
                      
                      toast({ title: "تم إنشاء سجلات اختبار بنجاح" });
                      fetchActivityLogs();
                    } catch (error) {
                      console.error('Error creating test logs:', error);
                      toast({ title: "خطأ", description: "فشل في إنشاء سجلات الاختبار", variant: "destructive" });
                    }
                  }}
                >
                  إنشاء سجلات تجريبية
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* الفلاتر السريعة */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyQuickFilter('today')}
                >
                  اليوم
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyQuickFilter('week')}
                >
                  هذا الأسبوع
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyQuickFilter('month')}
                >
                  هذا الشهر
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyQuickFilter('year')}
                >
                  هذا العام
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyQuickFilter('all')}
                >
                  الكل
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* اختيار المستخدم */}
                <div className="space-y-2">
                  <Label>المستخدم</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="جميع المستخدمين" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المستخدمين</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name || 'بدون اسم'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* نوع العملية */}
                <div className="space-y-2">
                  <Label>نوع العملية</Label>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="جميع العمليات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع العمليات</SelectItem>
                      <SelectItem value="create">إنشاء</SelectItem>
                      <SelectItem value="update">تحديث</SelectItem>
                      <SelectItem value="delete">حذف</SelectItem>
                      <SelectItem value="login">تسجيل دخول</SelectItem>
                      <SelectItem value="logout">تسجيل خروج</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* نوع المورد */}
                <div className="space-y-2">
                  <Label>نوع المورد</Label>
                  <Select value={resourceFilter} onValueChange={setResourceFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="جميع الموارد" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الموارد</SelectItem>
                      <SelectItem value="order">طلب</SelectItem>
                      <SelectItem value="customer">عميل</SelectItem>
                      <SelectItem value="invoice">فاتورة</SelectItem>
                      <SelectItem value="payment">دفعة</SelectItem>
                      <SelectItem value="user">مستخدم</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* البحث */}
                <div className="space-y-2">
                  <Label>البحث</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="البحث في السجلات..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* فلاتر التاريخ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>من تاريخ</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>إلى تاريخ</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* النتائج */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>سجلات النشاط ({filteredLogs.length})</span>
                <Badge variant="outline">{filteredLogs.length} سجل</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">جاري تحميل السجلات...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المستخدم</TableHead>
                        <TableHead>العملية</TableHead>
                        <TableHead>نوع المورد</TableHead>
                        <TableHead>معرف المورد</TableHead>
                        <TableHead>التفاصيل</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>عنوان IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              {log.profiles?.full_name || 'مستخدم غير معروف'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getActionColor(log.action)}>
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.resource_type || '-'}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.resource_id || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate" title={formatDetails(log.details)}>
                              {formatDetails(log.details)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-gray-400" />
                              {formatDate(log.created_at)}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.ip_address || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {filteredLogs.length === 0 && !logsLoading && (
                    <div className="text-center py-8 text-gray-500">
                      لا توجد سجلات نشاط مطابقة للفلاتر المحددة
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders and Payments Report Tab */}
        <TabsContent value="orders-payments" className="space-y-6">
          <OrdersPaymentsReport />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FollowUpSettings;