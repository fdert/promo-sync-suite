import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Link, Shield, Save } from 'lucide-react';

interface ElectronicInvoiceSettings {
  verification_enabled: boolean;
  verification_base_url: string;
  verification_message_ar: string;
  verification_message_en: string;
  qr_code_enabled: boolean;
  digital_signature_enabled: boolean;
  auto_generate_verification: boolean;
}

const ElectronicInvoiceSettings = () => {
  const [settings, setSettings] = useState<ElectronicInvoiceSettings>({
    verification_enabled: true,
    verification_base_url: window.location.origin + '/verify',
    verification_message_ar: 'فاتورة إلكترونية معتمدة - يمكن التحقق من صحتها إلكترونياً',
    verification_message_en: 'Certified Electronic Invoice - Verification Available',
    qr_code_enabled: true,
    digital_signature_enabled: false,
    auto_generate_verification: true
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('website_settings')
        .select('setting_value')
        .eq('setting_key', 'electronic_invoice_settings')
        .single();

      if (data && !error && data.setting_value) {
        setSettings({ ...settings, ...(data.setting_value as Record<string, any>) });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // التحقق من وجود الإعدادات مسبقاً
      const { data: existingSettings } = await supabase
        .from('website_settings')
        .select('id')
        .eq('setting_key', 'electronic_invoice_settings')
        .single();

      let error;
      
      if (existingSettings) {
        // تحديث الإعدادات الموجودة
        const result = await supabase
          .from('website_settings')
          .update({
            setting_value: settings as any,
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', 'electronic_invoice_settings');
        error = result.error;
      } else {
        // إنشاء إعدادات جديدة
        const result = await supabase
          .from('website_settings')
          .insert({
            setting_key: 'electronic_invoice_settings',
            setting_value: settings as any,
            created_by: (await supabase.auth.getUser()).data.user?.id
          });
        error = result.error;
      }

      if (error) throw error;

      toast.success('تم حفظ إعدادات الفواتير الإلكترونية بنجاح');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const generateTestLink = () => {
    const testId = 'test-invoice-id';
    const fullUrl = `${settings.verification_base_url}/${testId}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success('تم نسخ رابط التجربة إلى الحافظة');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">إعدادات الفواتير الإلكترونية</h1>
          <p className="text-muted-foreground">
            إدارة نظام التحقق الإلكتروني من الفواتير
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* إعدادات التحقق الأساسية */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              إعدادات التحقق الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">تفعيل نظام التحقق الإلكتروني</Label>
                <p className="text-sm text-muted-foreground">
                  السماح للعملاء بالتحقق من صحة الفواتير إلكترونياً
                </p>
              </div>
              <Switch
                checked={settings.verification_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, verification_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">إنشاء رابط التحقق تلقائياً</Label>
                <p className="text-sm text-muted-foreground">
                  إنشاء رابط التحقق عند إنشاء فاتورة جديدة
                </p>
              </div>
              <Switch
                checked={settings.auto_generate_verification}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, auto_generate_verification: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="base-url">رابط التحقق الأساسي</Label>
              <Input
                id="base-url"
                value={settings.verification_base_url}
                onChange={(e) =>
                  setSettings({ ...settings, verification_base_url: e.target.value })
                }
                placeholder="https://yourdomain.com/verify"
              />
              <p className="text-sm text-muted-foreground">
                الرابط الأساسي الذي سيتم استخدامه للتحقق من الفواتير
              </p>
            </div>
          </CardContent>
        </Card>

        {/* رسائل التحقق */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              رسائل التحقق
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message-ar">رسالة التحقق (العربية)</Label>
              <Textarea
                id="message-ar"
                value={settings.verification_message_ar}
                onChange={(e) =>
                  setSettings({ ...settings, verification_message_ar: e.target.value })
                }
                placeholder="فاتورة إلكترونية معتمدة - يمكن التحقق من صحتها إلكترونياً"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message-en">رسالة التحقق (الإنجليزية)</Label>
              <Textarea
                id="message-en"
                value={settings.verification_message_en}
                onChange={(e) =>
                  setSettings({ ...settings, verification_message_en: e.target.value })
                }
                placeholder="Certified Electronic Invoice - Verification Available"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* إعدادات إضافية */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              إعدادات إضافية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">تفعيل رمز QR</Label>
                <p className="text-sm text-muted-foreground">
                  إضافة رمز QR للوصول السريع لرابط التحقق
                </p>
              </div>
              <Switch
                checked={settings.qr_code_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, qr_code_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">التوقيع الرقمي</Label>
                <p className="text-sm text-muted-foreground">
                  إضافة توقيع رقمي للفواتير (قريباً)
                </p>
              </div>
              <Switch
                checked={settings.digital_signature_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, digital_signature_enabled: checked })
                }
                disabled
              />
            </div>
          </CardContent>
        </Card>

        {/* معاينة وأدوات */}
        <Card>
          <CardHeader>
            <CardTitle>معاينة وأدوات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">مثال على رابط التحقق:</h4>
              <code className="text-sm bg-background p-2 rounded block">
                {settings.verification_base_url}/invoice-id-12345
              </code>
            </div>

            <Button onClick={generateTestLink} variant="outline">
              <Link className="h-4 w-4 mr-2" />
              نسخ رابط تجريبي
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </Button>
      </div>
    </div>
  );
};

export default ElectronicInvoiceSettings;