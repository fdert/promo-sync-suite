import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, MessageSquare, Clock, DollarSign, AlertCircle, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FollowUpSettings {
  id?: string;
  follow_up_whatsapp?: string;
  follow_up_email?: string;
  send_whatsapp_on_new_order: boolean;
  send_whatsapp_on_delivery_delay: boolean;
  send_whatsapp_on_payment_delay: boolean;
  send_whatsapp_on_failure: boolean;
  delivery_delay_days: number;
  payment_delay_days: number;
}

const FollowUpSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<FollowUpSettings>({
    send_whatsapp_on_new_order: true,
    send_whatsapp_on_delivery_delay: true,
    send_whatsapp_on_payment_delay: true,
    send_whatsapp_on_failure: true,
    delivery_delay_days: 7,
    payment_delay_days: 30,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchSettings();
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
          follow_up_whatsapp: data.follow_up_whatsapp || '',
          follow_up_email: data.follow_up_email || '',
          send_whatsapp_on_new_order: data.send_whatsapp_on_new_order,
          send_whatsapp_on_delivery_delay: data.send_whatsapp_on_delivery_delay,
          send_whatsapp_on_payment_delay: data.send_whatsapp_on_payment_delay,
          send_whatsapp_on_failure: data.send_whatsapp_on_failure,
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
        follow_up_whatsapp: settings.follow_up_whatsapp,
        follow_up_email: settings.follow_up_email,
        send_whatsapp_on_new_order: settings.send_whatsapp_on_new_order,
        send_whatsapp_on_delivery_delay: settings.send_whatsapp_on_delivery_delay,
        send_whatsapp_on_payment_delay: settings.send_whatsapp_on_payment_delay,
        send_whatsapp_on_failure: settings.send_whatsapp_on_failure,
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
      
      if (!settingsData.follow_up_whatsapp) {
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
📱 رقم واتساب فريق المتابعة: ${settingsData.follow_up_whatsapp}
📨 الرسائل المعلقة: ${pendingMessages?.length || 0}
📋 الطلبات الحديثة: ${recentOrders?.length || 0}

⚙️ الإعدادات النشطة:
• إشعار طلب جديد: ${settingsData.send_whatsapp_on_new_order ? 'مفعل' : 'معطل'}
• إشعار تأخير التسليم: ${settingsData.send_whatsapp_on_delivery_delay ? 'مفعل' : 'معطل'}
• إشعار تأخير الدفع: ${settingsData.send_whatsapp_on_payment_delay ? 'مفعل' : 'معطل'}
• إشعار فشل الواتساب: ${settingsData.send_whatsapp_on_failure ? 'مفعل' : 'معطل'}

🔧 مهل زمنية:
• مهلة التسليم: ${settingsData.delivery_delay_days} أيام
• مهلة الدفع: ${settingsData.payment_delay_days} أيام

⏰ وقت الاختبار: ${new Date().toLocaleString('ar-SA')}`;

      // حفظ رسالة الاختبار
      const { error: insertError } = await supabase
        .from('whatsapp_messages')
        .insert({
          from_number: 'test_system',
          to_number: settingsData.follow_up_whatsapp,
          message_type: 'follow_up_test',
          message_content: testMessage,
          status: 'pending'
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
        <h1 className="text-3xl font-bold text-foreground">إعدادات إدارة المتابعة</h1>
        <p className="text-muted-foreground mt-2">
          إدارة إعدادات المتابعة وإشعارات الواتساب الداخلية لفريق المتابعة والإدارة
        </p>
      </div>

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
                  value={settings.follow_up_whatsapp || ''}
                  onChange={(e) => setSettings({ ...settings, follow_up_whatsapp: e.target.value })}
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
                  value={settings.follow_up_email || ''}
                  onChange={(e) => setSettings({ ...settings, follow_up_email: e.target.value })}
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
                  checked={settings.send_whatsapp_on_new_order}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, send_whatsapp_on_new_order: checked })
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
                  checked={settings.send_whatsapp_on_delivery_delay}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, send_whatsapp_on_delivery_delay: checked })
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
                  checked={settings.send_whatsapp_on_payment_delay}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, send_whatsapp_on_payment_delay: checked })
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
                  checked={settings.send_whatsapp_on_failure}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, send_whatsapp_on_failure: checked })
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
                    type="number"
                    min="1"
                    max="365"
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
                    type="number"
                    min="1"
                    max="365"
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
            disabled={testing || !settings.follow_up_whatsapp}
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
    </div>
  );
};

export default FollowUpSettings;