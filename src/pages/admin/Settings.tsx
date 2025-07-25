import { useState } from "react";
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
import { Settings as SettingsIcon, User, Building2, Bell, Shield, Palette, Database } from "lucide-react";

const Settings = () => {
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">الإعدادات</h1>
          <p className="text-muted-foreground">إدارة إعدادات النظام والحساب</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
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
                  <AvatarFallback className="text-lg">أح</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline">تغيير الصورة</Button>
                  <p className="text-sm text-muted-foreground">JPG, PNG حتى 2MB</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">الاسم الأول</Label>
                  <Input id="firstName" defaultValue="أحمد" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">الاسم الأخير</Label>
                  <Input id="lastName" defaultValue="محمد" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input id="email" type="email" defaultValue="ahmed@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input id="phone" defaultValue="+966 50 123 4567" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">المنصب</Label>
                  <Input id="position" defaultValue="مدير المشاريع" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">القسم</Label>
                  <Select defaultValue="management">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="management">الإدارة</SelectItem>
                      <SelectItem value="development">التطوير</SelectItem>
                      <SelectItem value="design">التصميم</SelectItem>
                      <SelectItem value="marketing">التسويق</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>حفظ التغييرات</Button>
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
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">اسم الشركة</Label>
                  <Input id="companyName" defaultValue="شركة الحلول التقنية" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">المجال</Label>
                  <Select defaultValue="technology">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">التكنولوجيا</SelectItem>
                      <SelectItem value="marketing">التسويق</SelectItem>
                      <SelectItem value="consulting">الاستشارات</SelectItem>
                      <SelectItem value="design">التصميم</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxNumber">الرقم الضريبي</Label>
                  <Input id="taxNumber" defaultValue="300123456789003" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commercialRecord">السجل التجاري</Label>
                  <Input id="commercialRecord" defaultValue="1010123456" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">العنوان</Label>
                <Textarea id="address" defaultValue="الرياض، حي النرجس، شارع الأمير سلطان" />
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">المدينة</Label>
                  <Input id="city" defaultValue="الرياض" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">الرمز البريدي</Label>
                  <Input id="postalCode" defaultValue="12345" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">الدولة</Label>
                  <Select defaultValue="saudi">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="saudi">المملكة العربية السعودية</SelectItem>
                      <SelectItem value="uae">الإمارات العربية المتحدة</SelectItem>
                      <SelectItem value="kuwait">الكويت</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>حفظ بيانات الشركة</Button>
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
                    <Badge variant="outline" className="text-green-600">نشط</Badge>
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
      </Tabs>
    </div>
  );
};

export default Settings;