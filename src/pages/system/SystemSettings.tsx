import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Save, Globe, Bell, Shield, Database, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SystemSetting {
  setting_key: string;
  setting_value: any;
}

const SystemSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, any>>({
    system_info: {
      name: "",
      version: "",
      description: "",
      logo_url: "",
      support_email: "",
      support_phone: ""
    },
    platform_settings: {
      allow_registration: true,
      require_email_verification: true,
      trial_period_days: 14,
      max_agencies_per_user: 3,
      default_agency_plan: "basic",
      maintenance_mode: false
    },
    notification_settings: {
      email_notifications: true,
      sms_notifications: false,
      push_notifications: true,
      admin_notifications: {
        new_agency_registration: true,
        payment_failures: true,
        subscription_cancellations: true
      }
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');

      if (error) throw error;

      const settingsMap = data?.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {} as Record<string, any>) || {};

      setSettings(prev => ({ ...prev, ...settingsMap }));
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('حدث خطأ في جلب الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: key,
          setting_value: value
        });

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        [key]: value
      }));

      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('حدث خطأ في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const handleSystemInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSetting('system_info', settings.system_info);
  };

  const handlePlatformSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSetting('platform_settings', settings.platform_settings);
  };

  const handleNotificationSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSetting('notification_settings', settings.notification_settings);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            رجوع
          </Button>
          <div>
            <h1 className="text-3xl font-bold">إعدادات النظام</h1>
            <p className="text-muted-foreground">إدارة الإعدادات العامة للمنصة</p>
          </div>
        </div>
        <Settings className="h-8 w-8 text-muted-foreground" />
      </div>

      <Tabs defaultValue="system" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            معلومات النظام
          </TabsTrigger>
          <TabsTrigger value="platform" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            إعدادات المنصة
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            الإشعارات
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            قاعدة البيانات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>معلومات النظام الأساسية</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSystemInfoSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="system_name">اسم النظام</Label>
                    <Input
                      id="system_name"
                      value={settings.system_info?.name || ''}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        system_info: { ...prev.system_info, name: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="version">الإصدار</Label>
                    <Input
                      id="version"
                      value={settings.system_info?.version || ''}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        system_info: { ...prev.system_info, version: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">وصف النظام</Label>
                  <Textarea
                    id="description"
                    value={settings.system_info?.description || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      system_info: { ...prev.system_info, description: e.target.value }
                    }))}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="support_email">بريد الدعم الفني</Label>
                    <Input
                      id="support_email"
                      type="email"
                      value={settings.system_info?.support_email || ''}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        system_info: { ...prev.system_info, support_email: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="support_phone">هاتف الدعم الفني</Label>
                    <Input
                      id="support_phone"
                      value={settings.system_info?.support_phone || ''}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        system_info: { ...prev.system_info, support_phone: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="logo_url">رابط الشعار</Label>
                  <Input
                    id="logo_url"
                    value={settings.system_info?.logo_url || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      system_info: { ...prev.system_info, logo_url: e.target.value }
                    }))}
                  />
                </div>

                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platform">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات المنصة العامة</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePlatformSettingsSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>السماح بالتسجيل الجديد</Label>
                      <p className="text-sm text-muted-foreground">
                        السماح للمستخدمين الجدد بإنشاء حسابات
                      </p>
                    </div>
                    <Switch
                      checked={settings.platform_settings?.allow_registration || false}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        platform_settings: { ...prev.platform_settings, allow_registration: checked }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>تأكيد البريد الإلكتروني مطلوب</Label>
                      <p className="text-sm text-muted-foreground">
                        يتطلب من المستخدمين تأكيد بريدهم الإلكتروني
                      </p>
                    </div>
                    <Switch
                      checked={settings.platform_settings?.require_email_verification || false}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        platform_settings: { ...prev.platform_settings, require_email_verification: checked }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>وضع الصيانة</Label>
                      <p className="text-sm text-muted-foreground">
                        تفعيل وضع الصيانة يمنع الوصول للنظام
                      </p>
                    </div>
                    <Switch
                      checked={settings.platform_settings?.maintenance_mode || false}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        platform_settings: { ...prev.platform_settings, maintenance_mode: checked }
                      }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="trial_period">فترة التجربة (بالأيام)</Label>
                    <Input
                      id="trial_period"
                      type="number"
                      value={settings.platform_settings?.trial_period_days || 14}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        platform_settings: { ...prev.platform_settings, trial_period_days: Number(e.target.value) }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_agencies">أقصى عدد وكالات لكل مستخدم</Label>
                    <Input
                      id="max_agencies"
                      type="number"
                      value={settings.platform_settings?.max_agencies_per_user || 3}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        platform_settings: { ...prev.platform_settings, max_agencies_per_user: Number(e.target.value) }
                      }))}
                    />
                  </div>
                </div>

                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الإشعارات</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNotificationSettingsSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>إشعارات البريد الإلكتروني</Label>
                      <p className="text-sm text-muted-foreground">
                        تفعيل إرسال الإشعارات عبر البريد الإلكتروني
                      </p>
                    </div>
                    <Switch
                      checked={settings.notification_settings?.email_notifications || false}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        notification_settings: { ...prev.notification_settings, email_notifications: checked }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>إشعارات SMS</Label>
                      <p className="text-sm text-muted-foreground">
                        تفعيل إرسال الإشعارات عبر الرسائل النصية
                      </p>
                    </div>
                    <Switch
                      checked={settings.notification_settings?.sms_notifications || false}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        notification_settings: { ...prev.notification_settings, sms_notifications: checked }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>الإشعارات الفورية</Label>
                      <p className="text-sm text-muted-foreground">
                        تفعيل الإشعارات الفورية في المتصفح
                      </p>
                    </div>
                    <Switch
                      checked={settings.notification_settings?.push_notifications || false}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        notification_settings: { ...prev.notification_settings, push_notifications: checked }
                      }))}
                    />
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-4">إشعارات الإدارة</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>تسجيل وكالة جديدة</Label>
                      <Switch
                        checked={settings.notification_settings?.admin_notifications?.new_agency_registration || false}
                        onCheckedChange={(checked) => setSettings(prev => ({
                          ...prev,
                          notification_settings: {
                            ...prev.notification_settings,
                            admin_notifications: {
                              ...prev.notification_settings?.admin_notifications,
                              new_agency_registration: checked
                            }
                          }
                        }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>فشل في المدفوعات</Label>
                      <Switch
                        checked={settings.notification_settings?.admin_notifications?.payment_failures || false}
                        onCheckedChange={(checked) => setSettings(prev => ({
                          ...prev,
                          notification_settings: {
                            ...prev.notification_settings,
                            admin_notifications: {
                              ...prev.notification_settings?.admin_notifications,
                              payment_failures: checked
                            }
                          }
                        }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>إلغاء الاشتراكات</Label>
                      <Switch
                        checked={settings.notification_settings?.admin_notifications?.subscription_cancellations || false}
                        onCheckedChange={(checked) => setSettings(prev => ({
                          ...prev,
                          notification_settings: {
                            ...prev.notification_settings,
                            admin_notifications: {
                              ...prev.notification_settings?.admin_notifications,
                              subscription_cancellations: checked
                            }
                          }
                        }))}
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle>إدارة قاعدة البيانات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">تحذير</h4>
                  <p className="text-yellow-700 text-sm">
                    عمليات قاعدة البيانات قد تؤثر على أداء النظام. تأكد من عمل نسخة احتياطية قبل إجراء أي تغييرات.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" disabled>
                    <Database className="h-4 w-4 mr-2" />
                    نسخة احتياطية
                  </Button>
                  <Button variant="outline" disabled>
                    <Database className="h-4 w-4 mr-2" />
                    تحسين الأداء
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  هذه الميزات ستكون متاحة في الإصدارات القادمة
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemSettings;