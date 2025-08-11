import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, User, Mail, Phone, MapPin, Globe, Star, Check, ArrowRight, ArrowLeft, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SubscriptionPlan {
  id: string;
  name: string;
  name_ar: string;
  description?: string;
  price: number;
  billing_period: string;
  features: any;
  max_users_per_agency: number;
  max_orders_per_month: number;
  max_storage_gb: number;
  is_active: boolean;
  is_popular: boolean;
}

const CreateAgencyForm = () => {
  const [currentStep, setCurrentStep] = useState("basic");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    website: "",
    description: "",
    primary_color: "#2563eb",
    secondary_color: "#64748b"
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('حدث خطأ في جلب خطط الاشتراك');
    }
  };

  // إنشاء الحسابات المحاسبية الأساسية للوكالة
  const createBasicAccounts = async (agencyId: string, userId: string) => {
    const basicAccounts = [
      { name: 'النقدية', type: 'أصول', description: 'النقدية في الصندوق' },
      { name: 'البنك', type: 'أصول', description: 'الحسابات البنكية' },
      { name: 'الشبكة', type: 'أصول', description: 'مدفوعات الشبكة والبطاقات الائتمانية' },
      { name: 'العملاء المدينون', type: 'أصول', description: 'مستحقات العملاء' },
      { name: 'الخدمات المقدمة', type: 'إيرادات', description: 'إيرادات الخدمات' },
      { name: 'مصروفات التشغيل', type: 'مصروفات', description: 'مصروفات التشغيل العامة' },
      { name: 'رأس المال', type: 'حقوق ملكية', description: 'رأس مال الوكالة' }
    ];

    for (const account of basicAccounts) {
      await supabase
        .from('accounts')
        .insert({
          agency_id: agencyId,
          account_name: account.name,
          account_type: account.type,
          description: account.description,
          balance: 0,
          is_active: true,
          created_by: userId
        });
    }
  };

  // إنشاء الإعدادات الافتراضية للوكالة
  const createAgencySettings = async (agencyId: string) => {
    const defaultSettings = [
      {
        setting_key: 'company_info',
        setting_value: {
          name: formData.name,
          email: formData.contact_email,
          phone: formData.contact_phone,
          address: formData.address,
          website: formData.website,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color
        }
      },
      {
        setting_key: 'notification_settings',
        setting_value: {
          whatsapp_notifications: true,
          email_notifications: true,
          order_updates: true,
          payment_reminders: true
        }
      },
      {
        setting_key: 'print_settings',
        setting_value: {
          auto_print_invoices: false,
          print_barcode_labels: true,
          default_printer: '',
          label_format: 'thermal-80mm'
        }
      }
    ];

    for (const setting of defaultSettings) {
      await supabase
        .from('agency_settings')
        .insert({
          agency_id: agencyId,
          setting_key: setting.setting_key,
          setting_value: setting.setting_value
        });
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  };

  const handleNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      name: value,
      slug: generateSlug(value)
    }));
  };

  const validateStep = (step: string) => {
    switch (step) {
      case "basic":
        // التحقق من صحة البيانات الأساسية
        const isValidEmail = formData.contact_email && /\S+@\S+\.\S+/.test(formData.contact_email);
        const isValidName = formData.name && formData.name.trim().length > 0;
        return isValidName && isValidEmail;
      case "subscription":
        return selectedPlan && selectedPlan.length > 0;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (currentStep === "basic" && validateStep("basic")) {
      setCurrentStep("subscription");
    } else if (currentStep === "subscription" && validateStep("subscription")) {
      setCurrentStep("summary");
    } else {
      // عرض رسالة خطأ للبيانات المطلوبة
      if (currentStep === "basic") {
        if (!formData.name.trim()) {
          toast.error('يرجى إدخال اسم الوكالة');
          return;
        }
        if (!formData.contact_email.trim()) {
          toast.error('يرجى إدخال البريد الإلكتروني');
          return;
        }
        if (!/\S+@\S+\.\S+/.test(formData.contact_email)) {
          toast.error('يرجى إدخال بريد إلكتروني صحيح');
          return;
        }
      }
      if (currentStep === "subscription" && !selectedPlan) {
        toast.error('يرجى اختيار خطة اشتراك');
        return;
      }
    }
  };

  const prevStep = () => {
    if (currentStep === "subscription") {
      setCurrentStep("basic");
    } else if (currentStep === "summary") {
      setCurrentStep("subscription");
    }
  };

  const createAgencyWithSubscription = async () => {
    if (!selectedPlan) {
      toast.error('يرجى اختيار خطة اشتراك');
      return;
    }

    setLoading(true);
    try {
      console.log('🚀 بدء إنشاء الوكالة...');
      
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (!currentUser) throw new Error('المستخدم غير مصرح له');
      
      console.log('✅ تم التحقق من المستخدم:', currentUser.id);

      // التحقق من عدم وجود وكالة بنفس الاسم أو الرابط
      console.log('🔍 التحقق من عدم وجود وكالة مكررة...');
      const { data: existingAgency, error: checkError } = await supabase
        .from('agencies')
        .select('id, name, slug')
        .or(`name.eq.${formData.name},slug.eq.${formData.slug}`)
        .limit(1);

      if (checkError) {
        console.error('❌ خطأ في التحقق من الوكالة:', checkError);
        throw checkError;
      }

      if (existingAgency && existingAgency.length > 0) {
        const existing = existingAgency[0];
        if (existing.name === formData.name) {
          throw new Error('يوجد وكالة أخرى بنفس الاسم');
        }
        if (existing.slug === formData.slug) {
          throw new Error('الرابط المخصص مستخدم من قبل وكالة أخرى');
        }
      }

      console.log('✅ لا توجد وكالة مكررة');

      // إنشاء الوكالة
      console.log('📝 إنشاء الوكالة مع البيانات:', formData);
      const { data: agencyData, error: agencyError } = await supabase
        .from('agencies')
        .insert({
          ...formData,
          is_active: true,
          subscription_plan: selectedPlan,
          created_by: currentUser.id
        })
        .select()
        .single();

      if (agencyError) {
        console.error('❌ خطأ في إنشاء الوكالة:', agencyError);
        throw agencyError;
      }
      
      console.log('✅ تم إنشاء الوكالة بنجاح:', agencyData);

      // إنشاء اشتراك نشط للوكالة
      const selectedPlanData = plans.find(p => p.id === selectedPlan);
      if (selectedPlanData) {
        console.log('📋 إنشاء الاشتراك للباقة:', selectedPlanData.name_ar);
        
        const subscriptionEndDate = new Date();
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 
          (selectedPlanData.billing_period === 'yearly' ? 12 : 1));

        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .insert({
            agency_id: agencyData.id,
            plan_id: selectedPlan,
            status: 'active',
            starts_at: new Date().toISOString(),
            ends_at: subscriptionEndDate.toISOString()
          });
          
        if (subscriptionError) {
          console.error('❌ خطأ في إنشاء الاشتراك:', subscriptionError);
          throw subscriptionError;
        }
        
        console.log('✅ تم إنشاء الاشتراك بنجاح');
      }

      // إضافة المستخدم الحالي كمالك للوكالة
      console.log('👤 إضافة المستخدم كمالك للوكالة');
      const { error: memberError } = await supabase
        .from('agency_members')
        .insert({
          agency_id: agencyData.id,
          user_id: currentUser.id,
          role: 'owner',
          created_by: currentUser.id
        });

      if (memberError) {
        console.error('❌ خطأ في إضافة العضوية:', memberError);
        throw memberError;
      }
      
      console.log('✅ تم إضافة المستخدم كمالك بنجاح');

      // إنشاء الحسابات المحاسبية الأساسية
      console.log('💰 إنشاء الحسابات المحاسبية الأساسية');
      try {
        await createBasicAccounts(agencyData.id, currentUser.id);
        console.log('✅ تم إنشاء الحسابات المحاسبية بنجاح');
      } catch (accountsError) {
        console.error('⚠️ خطأ في إنشاء الحسابات المحاسبية:', accountsError);
        // لا نوقف العملية هنا، فقط تحذير
      }

      // إنشاء الإعدادات الافتراضية للوكالة
      console.log('⚙️ إنشاء الإعدادات الافتراضية');
      try {
        await createAgencySettings(agencyData.id);
        console.log('✅ تم إنشاء الإعدادات الافتراضية بنجاح');
      } catch (settingsError) {
        console.error('⚠️ خطأ في إنشاء الإعدادات:', settingsError);
        // لا نوقف العملية هنا، فقط تحذير
      }

      // إضافة دور super_admin للمستخدم الحالي إذا لم يكن لديه
      console.log('👑 إضافة دور المسؤول');
      try {
        await supabase
          .from('user_roles')
          .upsert({
            user_id: currentUser.id,
            role: 'super_admin'
          });
        console.log('✅ تم إضافة دور المسؤول بنجاح');
      } catch (roleError) {
        console.error('⚠️ خطأ في إضافة الدور:', roleError);
        // لا نوقف العملية هنا
      }

      console.log('🎉 تم إنشاء الوكالة بنجاح!');
      toast.success('تم إنشاء الوكالة وتفعيل الاشتراك بنجاح! سيتم توجيهك للوحة تحكم الوكالة...');
      
      // توجيه المستخدم للوحة تحكم الوكالة الجديدة بعد 2 ثانية
      setTimeout(() => {
        window.open(`/admin/dashboard?agency=${agencyData.id}`, '_blank');
        window.location.reload();
      }, 2000);
      
    } catch (error: any) {
      console.error('💥 خطأ عام في إنشاء الوكالة:', error);
      
      // عرض رسالة خطأ مفصلة
      let errorMessage = 'حدث خطأ في إنشاء الوكالة';
      
      if (error.message?.includes('duplicate key')) {
        errorMessage = 'اسم الوكالة أو الرابط المخصص موجود مسبقاً';
      } else if (error.message?.includes('permission')) {
        errorMessage = 'ليس لديك صلاحية لإنشاء وكالة جديدة';
      } else if (error.message?.includes('violates')) {
        errorMessage = 'خطأ في البيانات المدخلة، يرجى المراجعة';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Tabs value={currentStep} onValueChange={setCurrentStep} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic" disabled={false}>
            <Building2 className="h-4 w-4 mr-2" />
            معلومات الوكالة
          </TabsTrigger>
          <TabsTrigger value="subscription" disabled={!validateStep("basic")}>
            <Star className="h-4 w-4 mr-2" />
            خطة الاشتراك
          </TabsTrigger>
          <TabsTrigger value="summary" disabled={!validateStep("subscription")}>
            <Check className="h-4 w-4 mr-2" />
            مراجعة الطلب
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[70vh] mt-4">
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  المعلومات الأساسية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">اسم الوكالة *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                      placeholder="مثال: وكالة الإبداع"
                    />
                  </div>
                  <div>
                    <Label htmlFor="slug">الرابط المخصص</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({...formData, slug: e.target.value})}
                      placeholder="agency-name"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">وصف الوكالة</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="وصف مختصر عن خدمات الوكالة"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  معلومات التواصل
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact_email">البريد الإلكتروني *</Label>
                    <div className="relative">
                      <Mail className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input
                        id="contact_email"
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                        required
                        className="pl-10"
                        placeholder="info@agency.com"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="contact_phone">رقم الهاتف</Label>
                    <div className="relative">
                      <Phone className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input
                        id="contact_phone"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                        className="pl-10"
                        placeholder="+966xxxxxxxxx"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="address">العنوان</Label>
                    <div className="relative">
                      <MapPin className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        className="pl-10"
                        placeholder="الرياض، المملكة العربية السعودية"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="website">الموقع الإلكتروني</Label>
                    <div className="relative">
                      <Globe className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => setFormData({...formData, website: e.target.value})}
                        className="pl-10"
                        placeholder="https://agency.com"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  الألوان والهوية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primary_color">اللون الأساسي</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primary_color"
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        value={formData.primary_color}
                        onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                        placeholder="#2563eb"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="secondary_color">اللون الثانوي</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondary_color"
                        type="color"
                        value={formData.secondary_color}
                        onChange={(e) => setFormData({...formData, secondary_color: e.target.value})}
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        value={formData.secondary_color}
                        onChange={(e) => setFormData({...formData, secondary_color: e.target.value})}
                        placeholder="#64748b"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={nextStep} disabled={!validateStep("basic")}>
                التالي
                <ArrowRight className="h-4 w-4 mr-2" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="subscription" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  اختيار خطة الاشتراك
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plans.map((plan) => (
                    <Card
                      key={plan.id}
                      className={`cursor-pointer transition-all ${
                        selectedPlan === plan.id
                          ? 'ring-2 ring-primary border-primary'
                          : 'hover:border-primary/50'
                      } ${plan.is_popular ? 'border-yellow-500' : ''}`}
                      onClick={() => setSelectedPlan(plan.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{plan.name_ar}</CardTitle>
                          {plan.is_popular && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">
                              <Star className="h-3 w-3 mr-1" />
                              الأكثر شعبية
                            </Badge>
                          )}
                        </div>
                        <div className="text-2xl font-bold">
                          {plan.price} ر.س
                          <span className="text-sm font-normal text-muted-foreground">
                            /{plan.billing_period === 'monthly' ? 'شهر' : 'سنة'}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {plan.max_users_per_agency} مستخدم
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-muted-foreground" />
                          {plan.max_orders_per_month} طلب/شهر
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-muted-foreground" />
                          {plan.max_storage_gb} GB تخزين
                        </div>
                        {plan.description && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {plan.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                <ArrowLeft className="h-4 w-4 ml-2" />
                السابق
              </Button>
              <Button onClick={nextStep} disabled={!validateStep("subscription")}>
                التالي
                <ArrowRight className="h-4 w-4 mr-2" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="summary" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5" />
                  مراجعة الطلب
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold">معلومات الوكالة</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">الاسم:</span> {formData.name}</div>
                      <div><span className="font-medium">البريد الإلكتروني:</span> {formData.contact_email}</div>
                      {formData.contact_phone && (
                        <div><span className="font-medium">الهاتف:</span> {formData.contact_phone}</div>
                      )}
                      {formData.address && (
                        <div><span className="font-medium">العنوان:</span> {formData.address}</div>
                      )}
                      {formData.website && (
                        <div><span className="font-medium">الموقع:</span> {formData.website}</div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold">خطة الاشتراك</h4>
                    {selectedPlanData && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>الخطة:</span>
                          <Badge variant="default">{selectedPlanData.name_ar}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>السعر:</span>
                          <span className="font-bold">
                            {selectedPlanData.price} ر.س
                            /{selectedPlanData.billing_period === 'monthly' ? 'شهر' : 'سنة'}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div>• {selectedPlanData.max_users_per_agency} مستخدم</div>
                          <div>• {selectedPlanData.max_orders_per_month} طلب/شهر</div>
                          <div>• {selectedPlanData.max_storage_gb} GB تخزين</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                <ArrowLeft className="h-4 w-4 ml-2" />
                السابق
              </Button>
              <Button
                onClick={createAgencyWithSubscription}
                disabled={loading}
                className="min-w-[200px] bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    جاري إنشاء الوكالة...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    إنشاء الوكالة وتفعيل الاشتراك
                  </div>
                )}
              </Button>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

export default CreateAgencyForm;