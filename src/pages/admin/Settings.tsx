import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, User, Building2, Bell, Shield, Palette, Database, Paintbrush, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile data
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: ""
  });
  
  // Company data
  const [companyData, setCompanyData] = useState({
    company_name: "",
    company_logo: "",
    company_phone: "",
    company_address: "",
    tax_number: "",
    commercial_record: ""
  });
  
  // Settings states
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);
  
  // Color settings states
  const [primaryColor, setPrimaryColor] = useState("#8b5cf6");
  const [accentColor, setAccentColor] = useState("#0ea5e9");
  const [successColor, setSuccessColor] = useState("#16a34a");
  const [warningColor, setWarningColor] = useState("#ea580c");
  const [errorColor, setErrorColor] = useState("#dc2626");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile({
          full_name: profileData.full_name || "",
          email: profileData.email || "",
          phone: profileData.phone || ""
        });
      }

      // Fetch company settings from website_settings
      const { data: websiteData } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', 'website_content')
        .maybeSingle();

      if (websiteData?.value && typeof websiteData.value === 'object') {
        const content = websiteData.value as any;
        setCompanyData({
          company_name: content.companyInfo?.name || "",
          company_logo: content.companyInfo?.logo || "",
          company_phone: content.contactInfo?.phone || "",
          company_address: content.contactInfo?.address || "",
          tax_number: content.companyInfo?.tax_number || "",
          commercial_record: content.companyInfo?.commercial_record || ""
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

  const saveProfile = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "تم الحفظ",
        description: "تم حفظ بياناتك الشخصية بنجاح",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ البيانات",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveCompanyData = async () => {
    try {
      setSaving(true);

      // Fetch current website settings
      const { data: currentData } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', 'website_content')
        .maybeSingle();

      const websiteContent = (currentData?.value as any) || {};

      // Update company data
      const updatedContent = {
        ...websiteContent,
        companyInfo: {
          ...websiteContent.companyInfo,
          name: companyData.company_name,
          logo: companyData.company_logo,
          tax_number: companyData.tax_number,
          commercial_record: companyData.commercial_record
        },
        contactInfo: {
          ...websiteContent.contactInfo,
          phone: companyData.company_phone,
          address: companyData.company_address
        }
      };

      const { error } = await supabase
        .from('website_settings')
        .update({
          value: updatedContent,
          updated_at: new Date().toISOString()
        })
        .eq('key', 'website_content');

      if (error) throw error;

      toast({
        title: "تم الحفظ",
        description: "تم حفظ بيانات الشركة بنجاح",
      });
    } catch (error) {
      console.error('Error saving company data:', error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ بيانات الشركة",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      
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
      
      setCompanyData(prev => ({ ...prev, company_logo: publicUrl }));

      toast({
        title: "تم رفع الشعار",
        description: "تم رفع شعار الشركة بنجاح",
      });

    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "خطأ",
        description: "فشل في رفع الشعار",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Avatar upload functionality can be added later
    toast({
      title: "قريباً",
      description: "ميزة رفع الصورة الشخصية ستكون متاحة قريباً",
    });
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">الإعدادات</h1>
          <p className="text-muted-foreground">إدارة إعدادات النظام والحساب</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            الملف الشخصي
          </TabsTrigger>
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="h-4 w-4" />
            بيانات الشركة
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            الإشعارات
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            الأمان
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            المظهر
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Database className="h-4 w-4" />
            النظام
          </TabsTrigger>
          <TabsTrigger value="colors" className="gap-2">
            <Paintbrush className="h-4 w-4" />
            الألوان
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>الملف الشخصي</CardTitle>
              <CardDescription>إدارة معلوماتك الشخصية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-lg">
                    {profile.full_name ? profile.full_name.charAt(0) : "أح"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <Label htmlFor="avatar-upload">
                    <Button variant="outline" type="button" asChild disabled={saving}>
                      <span className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        {saving ? "جاري الرفع..." : "تغيير الصورة"}
                      </span>
                    </Button>
                  </Label>
                  <p className="text-sm text-muted-foreground">JPG, PNG حتى 2MB</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">الاسم الكامل</Label>
                  <Input 
                    id="full_name" 
                    value={profile.full_name}
                    onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={profile.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">لا يمكن تغيير البريد الإلكتروني</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input 
                    id="phone" 
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+966 50 123 4567"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveProfile} disabled={saving}>
                  {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Settings */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>بيانات الشركة</CardTitle>
              <CardDescription>معلومات الشركة والعمل</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>شعار الشركة</Label>
                {companyData.company_logo && (
                  <div className="mb-4">
                    <img 
                      src={companyData.company_logo} 
                      alt="شعار الشركة" 
                      className="w-32 h-32 object-contain border rounded-lg"
                    />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <Label htmlFor="logo-upload">
                  <Button variant="outline" type="button" asChild disabled={saving}>
                    <span className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      {saving ? "جاري الرفع..." : "رفع الشعار"}
                    </span>
                  </Button>
                </Label>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">اسم الشركة</Label>
                  <Input 
                    id="companyName" 
                    value={companyData.company_name}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, company_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">رقم الهاتف</Label>
                  <Input 
                    id="companyPhone" 
                    value={companyData.company_phone}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, company_phone: e.target.value }))}
                    placeholder="966501234567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxNumber">الرقم الضريبي</Label>
                  <Input 
                    id="taxNumber" 
                    value={companyData.tax_number}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, tax_number: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commercialRecord">السجل التجاري</Label>
                  <Input 
                    id="commercialRecord" 
                    value={companyData.commercial_record}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, commercial_record: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">العنوان</Label>
                <Textarea 
                  id="address" 
                  value={companyData.company_address}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, company_address: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={saveCompanyData} disabled={saving}>
                  {saving ? "جاري الحفظ..." : "حفظ بيانات الشركة"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الإشعارات</CardTitle>
              <CardDescription>تخصيص تفضيلات الإشعارات</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">إشعارات الموقع</Label>
                    <p className="text-sm text-muted-foreground">تلقي إشعارات داخل الموقع</p>
                  </div>
                  <Switch checked={notifications} onCheckedChange={setNotifications} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">إشعارات البريد الإلكتروني</Label>
                    <p className="text-sm text-muted-foreground">تلقي إشعارات عبر البريد الإلكتروني</p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">أنواع الإشعارات</h4>
                <div className="space-y-3">
                  {[
                    "طلبات جديدة",
                    "تحديثات المشاريع",
                    "رسائل العملاء",
                    "الفواتير والمدفوعات",
                    "تقارير النظام",
                    "تحديثات الأمان"
                  ].map((item) => (
                    <div key={item} className="flex items-center justify-between">
                      <Label>{item}</Label>
                      <Switch defaultChecked />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button>حفظ إعدادات الإشعارات</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الأمان</CardTitle>
              <CardDescription>إدارة كلمة المرور والأمان</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">جلسات نشطة</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Chrome على Windows</p>
                      <p className="text-sm text-muted-foreground">الرياض، السعودية • الجلسة الحالية</p>
                    </div>
                    <Badge variant="outline" className="text-success">نشط</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Safari على iPhone</p>
                      <p className="text-sm text-muted-foreground">الرياض، السعودية • منذ يومين</p>
                    </div>
                    <Button variant="outline" size="sm">إنهاء الجلسة</Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline">إنهاء جميع الجلسات</Button>
                <Button>تغيير كلمة المرور</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات المظهر</CardTitle>
              <CardDescription>تخصيص مظهر النظام</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">الوضع الليلي</Label>
                    <p className="text-sm text-muted-foreground">تفعيل المظهر الداكن</p>
                  </div>
                  <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                </div>

                <div className="space-y-2">
                  <Label>اللغة</Label>
                  <Select defaultValue="ar">
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>المنطقة الزمنية</Label>
                  <Select defaultValue="riyadh">
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="riyadh">الرياض (GMT+3)</SelectItem>
                      <SelectItem value="dubai">دبي (GMT+4)</SelectItem>
                      <SelectItem value="cairo">القاهرة (GMT+2)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>حفظ إعدادات المظهر</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات النظام</CardTitle>
              <CardDescription>إدارة النسخ الاحتياطي والنظام</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">النسخ الاحتياطي التلقائي</Label>
                    <p className="text-sm text-muted-foreground">نسخ احتياطي يومي للبيانات</p>
                  </div>
                  <Switch checked={autoBackup} onCheckedChange={setAutoBackup} />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">معلومات النظام</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-sm text-muted-foreground">إصدار النظام</Label>
                    <p className="font-medium">v2.1.0</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">آخر تحديث</Label>
                    <p className="font-medium">15 يناير 2024</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">حجم قاعدة البيانات</Label>
                    <p className="font-medium">2.4 جيجابايت</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">آخر نسخة احتياطية</Label>
                    <p className="font-medium">اليوم 03:00 ص</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline">إنشاء نسخة احتياطية</Button>
                <Button variant="outline">تحقق من التحديثات</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Color Settings */}
        <TabsContent value="colors">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الألوان</CardTitle>
              <CardDescription>تخصيص ألوان النظام الأساسية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">اللون الأساسي</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#8b5cf6"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">اللون الرئيسي للأزرار والروابط</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accentColor">اللون المميز</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="accentColor"
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      placeholder="#0ea5e9"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">لون مميز للتدرجات والتأكيدات</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="successColor">لون النجاح</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="successColor"
                      type="color"
                      value={successColor}
                      onChange={(e) => setSuccessColor(e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={successColor}
                      onChange={(e) => setSuccessColor(e.target.value)}
                      placeholder="#16a34a"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">لون رسائل النجاح والحالات الإيجابية</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="warningColor">لون التحذير</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="warningColor"
                      type="color"
                      value={warningColor}
                      onChange={(e) => setWarningColor(e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={warningColor}
                      onChange={(e) => setWarningColor(e.target.value)}
                      placeholder="#ea580c"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">لون رسائل التحذير والحالات المعلقة</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="errorColor">لون الخطأ</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="errorColor"
                      type="color"
                      value={errorColor}
                      onChange={(e) => setErrorColor(e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={errorColor}
                      onChange={(e) => setErrorColor(e.target.value)}
                      placeholder="#dc2626"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">لون رسائل الخطأ والحالات السلبية</p>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">معاينة الألوان</h4>
                <div className="grid gap-4 md:grid-cols-5">
                  <div className="text-center">
                    <div 
                      className="w-full h-16 rounded-lg mb-2 flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: primaryColor }}
                    >
                      أساسي
                    </div>
                    <p className="text-sm text-muted-foreground">Primary</p>
                  </div>
                  <div className="text-center">
                    <div 
                      className="w-full h-16 rounded-lg mb-2 flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: accentColor }}
                    >
                      مميز
                    </div>
                    <p className="text-sm text-muted-foreground">Accent</p>
                  </div>
                  <div className="text-center">
                    <div 
                      className="w-full h-16 rounded-lg mb-2 flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: successColor }}
                    >
                      نجاح
                    </div>
                    <p className="text-sm text-muted-foreground">Success</p>
                  </div>
                  <div className="text-center">
                    <div 
                      className="w-full h-16 rounded-lg mb-2 flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: warningColor }}
                    >
                      تحذير
                    </div>
                    <p className="text-sm text-muted-foreground">Warning</p>
                  </div>
                  <div className="text-center">
                    <div 
                      className="w-full h-16 rounded-lg mb-2 flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: errorColor }}
                    >
                      خطأ
                    </div>
                    <p className="text-sm text-muted-foreground">Error</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">إعدادات متقدمة</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">تطبيق الألوان تلقائياً</Label>
                      <p className="text-sm text-muted-foreground">تطبيق التغييرات فور التعديل</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">حفظ الإعدادات محلياً</Label>
                      <p className="text-sm text-muted-foreground">حفظ تفضيلات الألوان في المتصفح</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline">إعادة تعيين</Button>
                <Button>حفظ الألوان</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;