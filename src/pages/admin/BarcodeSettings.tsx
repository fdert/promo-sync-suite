import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Tags, Upload, Eye, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useThermalPrint } from "@/hooks/useThermalPrint";

interface LabelSettings {
  id?: string;
  label_width: number;
  label_height?: number;
  paper_type: string;
  margins: number;
  barcode_height: number;
  barcode_width: number;
  font_size: number;
  show_company_logo: boolean;
  show_company_name: boolean;
  show_date: boolean;
  show_qr_code: boolean;
  company_logo_url?: string;
  company_name: string;
  company_phone?: string;
  company_address?: string;
}

interface WebsiteSettings {
  company_name?: string;
  company_logo?: string;
  company_phone?: string;
  company_address?: string;
}

const BarcodeSettings = () => {
  const [settings, setSettings] = useState<LabelSettings>({
    label_width: 80,
    label_height: undefined,
    paper_type: 'thermal-80mm',
    margins: 2,
    barcode_height: 50,
    barcode_width: 2,
    font_size: 12,
    show_company_logo: true,
    show_company_name: true,
    show_date: true,
    show_qr_code: false,
    company_name: 'وكالة الإبداع للدعاية والإعلان',
    company_phone: '',
    company_address: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  
  const { toast } = useToast();
  const { printBarcodeLabel } = useThermalPrint();

  // جلب الإعدادات الحالية
  useEffect(() => {
    fetchSettings();
    fetchWebsiteSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('barcode_label_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
        if (data.company_logo_url) {
          setLogoPreview(data.company_logo_url);
        }
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

  const fetchWebsiteSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('website_settings')
        .select('setting_value')
        .eq('setting_key', 'website_content')
        .single();

      if (error) {
        console.error('Error fetching website settings:', error);
        return;
      }

      if (data?.setting_value && typeof data.setting_value === 'object') {
        const websiteContent = data.setting_value as any;
        const companyInfo = websiteContent.companyInfo;
        const contactInfo = websiteContent.contactInfo;
        
        if (companyInfo || contactInfo) {
          // تحديث الإعدادات بالبيانات الحقيقية من الموقع
          setSettings(prev => ({
            ...prev,
            company_name: companyInfo?.name || 'وكالة الإبداع للدعاية والإعلان',
            company_phone: contactInfo?.phone || '',
            company_address: contactInfo?.address || '',
            company_logo_url: companyInfo?.logo || prev.company_logo_url,
          }));
          
          if (companyInfo?.logo) {
            setLogoPreview(companyInfo.logo);
          }

          toast({
            title: "تم ربط البيانات",
            description: "تم ربط معلومات الشركة من موقع الوكالة بنجاح",
          });
        }
      }
    } catch (error) {
      console.error('Error fetching website settings:', error);
      toast({
        title: "تعذر ربط البيانات",
        description: "لم نتمكن من ربط معلومات الشركة من الموقع",
        variant: "destructive",
      });
    }
  };

  const handleLogoUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `company-logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      
      setSettings(prev => ({ ...prev, company_logo_url: publicUrl }));
      setLogoPreview(publicUrl);

      toast({
        title: "تم رفع الشعار",
        description: "تم رفع شعار الشركة بنجاح",
      });

    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "خطأ في رفع الشعار",
        description: "حدث خطأ أثناء رفع الشعار",
        variant: "destructive",
      });
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      const settingsData = {
        ...settings,
        updated_at: new Date().toISOString()
      };

      if (settings.id) {
        // تحديث الإعدادات الموجودة
        const { error } = await supabase
          .from('barcode_label_settings')
          .update(settingsData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // إنشاء إعدادات جديدة
        const { data, error } = await supabase
          .from('barcode_label_settings')
          .insert(settingsData)
          .select()
          .single();

        if (error) throw error;
        setSettings(prev => ({ ...prev, id: data.id }));
      }

      // تحديث معلومات الشركة في website_settings أيضاً
      await updateWebsiteSettings();

      toast({
        title: "تم حفظ الإعدادات",
        description: "تم حفظ إعدادات الملصق ومعلومات الشركة بنجاح",
      });

    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ الإعدادات",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateWebsiteSettings = async () => {
    try {
      // جلب الإعدادات الحالية
      const { data: currentData } = await supabase
        .from('website_settings')
        .select('setting_value')
        .eq('setting_key', 'website_content')
        .single();

      if (currentData?.setting_value) {
        const websiteContent = currentData.setting_value as any;
        
        // تحديث معلومات الشركة
        const updatedContent = {
          ...websiteContent,
          companyInfo: {
            ...websiteContent.companyInfo,
            name: settings.company_name,
            logo: settings.company_logo_url || websiteContent.companyInfo?.logo,
          },
          contactInfo: {
            ...websiteContent.contactInfo,
            phone: settings.company_phone || websiteContent.contactInfo?.phone,
            address: settings.company_address || websiteContent.contactInfo?.address,
          }
        };

        const { error } = await supabase
          .from('website_settings')
          .update({ 
            setting_value: updatedContent,
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', 'website_content');

        if (error) {
          console.error('Error updating website settings:', error);
        }
      }
    } catch (error) {
      console.error('Error updating website settings:', error);
    }
  };

  const testPrint = async () => {
    // استخدام البيانات الحقيقية من الإعدادات
    const companyName = settings.company_name || 'وكالة الإبداع للدعاية والإعلان';
    const companyPhone = settings.company_phone || '966501234567';
    
    printBarcodeLabel(
      'ORD-001',
      'عميل تجريبي',
      companyPhone,
      'payment|1000|500',
      'test-id-123',
      {
        paperSize: settings.paper_type as any,
        margins: `${settings.margins}mm`,
        settings: settings
      }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل الإعدادات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">إعدادات ملصق الباركود</h1>
              <p className="text-muted-foreground mt-1">
                تخصيص مظهر ومقاسات ملصقات الباركود للطابعات الحرارية<br/>
                <span className="text-xs text-primary">مرتبط بمعلومات الوكالة الحقيقية من قاعدة البيانات</span>
              </p>
            </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={testPrint}>
            <Eye className="h-4 w-4 mr-2" />
            طباعة تجريبية
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* إعدادات المقاسات */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              إعدادات المقاسات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="label_width">عرض الملصق (مم)</Label>
                <Input
                  id="label_width"
                  type="number"
                  value={settings.label_width}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    label_width: Number(e.target.value) 
                  }))}
                  min="50"
                  max="150"
                />
              </div>
              
              <div>
                <Label htmlFor="label_height">ارتفاع الملصق (مم)</Label>
                <Input
                  id="label_height"
                  type="number"
                  value={settings.label_height || ''}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    label_height: e.target.value ? Number(e.target.value) : undefined 
                  }))}
                  placeholder="تلقائي"
                  min="30"
                  max="200"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="paper_type">نوع الورق</Label>
              <Select
                value={settings.paper_type}
                onValueChange={(value) => setSettings(prev => ({ ...prev, paper_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thermal-80mm">حراري 80 مم</SelectItem>
                  <SelectItem value="thermal-58mm">حراري 58 مم</SelectItem>
                  <SelectItem value="a4">A4 عادي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="margins">الهوامش (مم)</Label>
                <Input
                  id="margins"
                  type="number"
                  value={settings.margins}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    margins: Number(e.target.value) 
                  }))}
                  min="0"
                  max="10"
                  step="0.5"
                />
              </div>
              
              <div>
                <Label htmlFor="font_size">حجم الخط</Label>
                <Input
                  id="font_size"
                  type="number"
                  value={settings.font_size}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    font_size: Number(e.target.value) 
                  }))}
                  min="8"
                  max="20"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* إعدادات الباركود */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5" />
              إعدادات الباركود
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="barcode_height">ارتفاع الباركود (بكسل)</Label>
                <Input
                  id="barcode_height"
                  type="number"
                  value={settings.barcode_height}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    barcode_height: Number(e.target.value) 
                  }))}
                  min="30"
                  max="100"
                />
              </div>
              
              <div>
                <Label htmlFor="barcode_width">عرض خطوط الباركود</Label>
                <Input
                  id="barcode_width"
                  type="number"
                  value={settings.barcode_width}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    barcode_width: Number(e.target.value) 
                  }))}
                  min="1"
                  max="5"
                  step="0.5"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="show_qr_code">إظهار كود QR إضافي</Label>
                <Switch
                  id="show_qr_code"
                  checked={settings.show_qr_code}
                  onCheckedChange={(checked) => setSettings(prev => ({ 
                    ...prev, 
                    show_qr_code: checked 
                  }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* معلومات الشركة */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              معلومات الشركة
              <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                مرتبط بموقع الوكالة
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg mb-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                💡 هذه المعلومات مرتبطة مع موقع الوكالة. أي تغيير هنا سيظهر في الموقع والملصقات.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="company_name">اسم الشركة</Label>
                  <Input
                    id="company_name"
                    value={settings.company_name}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      company_name: e.target.value 
                    }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="company_phone">رقم الهاتف</Label>
                  <Input
                    id="company_phone"
                    value={settings.company_phone || ''}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      company_phone: e.target.value 
                    }))}
                    placeholder="966501234567"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="company_address">العنوان</Label>
                <Textarea
                  id="company_address"
                  value={settings.company_address || ''}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    company_address: e.target.value 
                  }))}
                  placeholder="عنوان الشركة"
                  rows={4}
                />
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label>شعار الشركة</Label>
                  {logoPreview && (
                    <div className="mt-2 mb-3">
                      <img 
                        src={logoPreview} 
                        alt="شعار الشركة" 
                        className="w-24 h-24 object-contain border rounded-lg"
                      />
                    </div>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setLogoFile(file);
                        handleLogoUpload(file);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_company_name">إظهار اسم الشركة</Label>
                  <Switch
                    id="show_company_name"
                    checked={settings.show_company_name}
                    onCheckedChange={(checked) => setSettings(prev => ({ 
                      ...prev, 
                      show_company_name: checked 
                    }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_company_logo">إظهار الشعار</Label>
                  <Switch
                    id="show_company_logo"
                    checked={settings.show_company_logo}
                    onCheckedChange={(checked) => setSettings(prev => ({ 
                      ...prev, 
                      show_company_logo: checked 
                    }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_date">إظهار التاريخ</Label>
                  <Switch
                    id="show_date"
                    checked={settings.show_date}
                    onCheckedChange={(checked) => setSettings(prev => ({ 
                      ...prev, 
                      show_date: checked 
                    }))}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BarcodeSettings;