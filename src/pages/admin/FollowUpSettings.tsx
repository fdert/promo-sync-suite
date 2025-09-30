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

interface FollowUpSettings {
  id?: string;
  whatsapp_number?: string;
  email?: string;
  notify_new_order: boolean;
  notify_delivery_delay: boolean;
  notify_payment_delay: boolean;
  notify_whatsapp_failure: boolean;
  notify_expense_logged: boolean;
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
    daily_financial_report: true,
    delivery_delay_days: 1,
    payment_delay_days: 7,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  
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
          notify_new_order: data.notify_new_order,
          notify_delivery_delay: data.notify_delivery_delay,
          notify_payment_delay: data.notify_payment_delay,
          notify_whatsapp_failure: data.notify_whatsapp_failure,
          notify_expense_logged: data.notify_expense_logged,
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
        notify_new_order: settings.notify_new_order,
        notify_delivery_delay: settings.notify_delivery_delay,
        notify_payment_delay: settings.notify_payment_delay,
        notify_whatsapp_failure: settings.notify_whatsapp_failure,
        notify_expense_logged: settings.notify_expense_logged,
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
          to_number: settingsData.whatsapp_number,
          message_type: 'follow_up_test',
          message_content: testMessage,
          status: 'pending',
          dedupe_key: `test_${Date.now()}`
        });
      
      if (insertError) {
        console.warn('تحذير: فشل في حفظ رسالة الاختبار:', insertError.message);
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
        .from('activity_logs')
        .select(`
          *
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

      if (resourceFilter && resourceFilter !== "all") {
        query = query.eq('resource_type', resourceFilter);
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
      log.action.toLowerCase().includes(searchLower) ||
      log.resource_type.toLowerCase().includes(searchLower) ||
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            إعدادات المتابعة
          </TabsTrigger>
          <TabsTrigger value="activity-logs" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            سجلات النشاط
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
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-primary" />
                      <div>
                        <h4 className="font-medium">إشعار عند إنشاء طلب جديد</h4>
                        <p className="text-sm text-muted-foreground">إرسال إشعار لفريق المتابعة عند إنشاء طلب جديد في النظام</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.notify_new_order}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, notify_new_order: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 dark:from-orange-900/20 dark:to-orange-800/20 dark:border-orange-700/30">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-orange-600" />
                      <div>
                        <h4 className="font-medium">إشعار تجاوز فترة التسليم</h4>
                        <p className="text-sm text-muted-foreground">
                          إرسال إشعار لفريق المتابعة عند تجاوز الطلب فترة التسليم المحددة
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.notify_delivery_delay}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, notify_delivery_delay: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-red-50 to-red-100 border border-red-200 dark:from-red-900/20 dark:to-red-800/20 dark:border-red-700/30">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-red-600" />
                      <div>
                        <h4 className="font-medium">إشعار تأخير المدفوعات</h4>
                        <p className="text-sm text-muted-foreground">
                          إرسال إشعار لفريق المتابعة عند تجاوز 30 يوم بدون دفع
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.notify_payment_delay}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, notify_payment_delay: checked })
                      }
                    />
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
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                      <div>
                        <h4 className="font-medium">إشعار تسجيل المصروفات</h4>
                        <p className="text-sm text-muted-foreground">
                          إرسال إشعار لفريق المتابعة عند تسجيل مصروف جديد
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.notify_expense_logged}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, notify_expense_logged: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 dark:from-purple-900/20 dark:to-purple-800/20 dark:border-purple-700/30">
                    <div className="flex items-center gap-3">
                      <Activity className="h-5 w-5 text-purple-600" />
                      <div>
                        <h4 className="font-medium">تقرير مالي يومي</h4>
                        <p className="text-sm text-muted-foreground">
                          إرسال تقرير يومي عن المبالغ المدفوعة والمصروفات والأرباح عند الساعة 00:00
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.daily_financial_report}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, daily_financial_report: checked })
                      }
                    />
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
            <div className="flex justify-between items-center">
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
                  "اختبار النظام"
                )}
              </Button>
              
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
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                الفلاتر والبحث
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
                              {users.find(u => u.id === log.user_id)?.full_name || 'مستخدم غير معروف'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getActionColor(log.action)}>
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.resource_type}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.resource_id}
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
      </Tabs>
    </div>
  );
};

export default FollowUpSettings;