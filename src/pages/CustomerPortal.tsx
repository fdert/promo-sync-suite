import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Building2, 
  Star, 
  Play, 
  Check, 
  Users, 
  Shield, 
  Headphones, 
  Globe, 
  Zap, 
  BarChart3,
  FileText,
  MessageSquare,
  Palette,
  LogIn,
  UserPlus,
  ArrowRight,
  CheckCircle,
  Crown,
  Sparkles,
  Rocket,
  Heart,
  TrendingUp,
  Award,
  Target,
  Clock,
  Mail,
  Phone,
  Eye,
  CreditCard
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionPlan {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  price: number;
  billing_period: string;
  max_agencies: number;
  max_users_per_agency: number;
  max_customers_per_agency: number;
  max_orders_per_month: number;
  max_storage_gb: number;
  features_ar: string[];
  is_popular: boolean;
  is_active: boolean;
}

const CustomerPortal = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ email: "", password: "", confirmPassword: "", fullName: "" });
  const [authLoading, setAuthLoading] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [signupDialogOpen, setSignupDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [websiteSettings, setWebsiteSettings] = useState<any>({});
  
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans();
    fetchWebsiteSettings();
  }, []);

  useEffect(() => {
    if (user) {
      navigate("/admin");
    }
  }, [user, navigate]);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      
      const formattedPlans = (data || []).map(plan => ({
        ...plan,
        features_ar: Array.isArray(plan.features_ar) ? plan.features_ar.map(f => String(f)) : []
      }));
      setPlans(formattedPlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWebsiteSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('website_settings')
        .select('setting_key, setting_value');

      if (error) throw error;
      
      const settingsMap = data?.reduce((acc: any, setting: any) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {}) || {};
      
      setWebsiteSettings(settingsMap);
    } catch (error) {
      console.error('Error fetching website settings:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    const { error } = await signIn(loginForm.email, loginForm.password);
    
    if (error) {
      toast({
        title: "خطأ في تسجيل الدخول",
        description: "بيانات تسجيل الدخول غير صحيحة",
        variant: "destructive",
      });
    } else {
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: "مرحباً بك في نظام إدارة الوكالات",
      });
      setLoginDialogOpen(false);
    }
    
    setAuthLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    if (signupForm.password !== signupForm.confirmPassword) {
      toast({
        title: "خطأ في كلمة المرور",
        description: "كلمة المرور وتأكيدها غير متطابقتان",
        variant: "destructive",
      });
      setAuthLoading(false);
      return;
    }

    const { error } = await signUp(signupForm.email, signupForm.password, signupForm.fullName);
    
    if (error) {
      toast({
        title: "خطأ في التسجيل",
        description: error.message.includes("User already registered") ? "البريد الإلكتروني مسجل مسبقاً" : "حدث خطأ أثناء التسجيل",
        variant: "destructive",
      });
    } else {
      toast({
        title: "تم إنشاء الحساب بنجاح",
        description: "يرجى تفعيل حسابك من البريد الإلكتروني",
      });
      setSignupDialogOpen(false);
    }
    
    setAuthLoading(false);
  };

  const handleSubscribe = (planId: string) => {
    setSelectedPlan(planId);
    if (!user) {
      setSignupDialogOpen(true);
    } else {
      // توجيه لصفحة الدفع
      toast({
        title: "قريباً!",
        description: "سيتم تفعيل نظام الدفع قريباً",
      });
    }
  };

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'Starter':
        return <Rocket className="h-8 w-8 text-primary" />;
      case 'Professional':
        return <Building2 className="h-8 w-8 text-primary" />;
      case 'Enterprise':
        return <Crown className="h-8 w-8 text-primary" />;
      default:
        return <Star className="h-8 w-8 text-primary" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="animate-pulse">
            <Building2 className="h-16 w-16 text-primary mx-auto mb-4" />
          </div>
          <p className="text-lg text-muted-foreground">جاري تحميل النظام...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Navigation */}
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">نظام إدارة الوكالات</h1>
                <p className="text-xs text-muted-foreground">للدعاية والإعلان</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <LogIn className="h-4 w-4" />
                    تسجيل الدخول
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-center">تسجيل الدخول</DialogTitle>
                    <DialogDescription className="text-center">
                      ادخل إلى حسابك في نظام إدارة الوكالات
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">البريد الإلكتروني</Label>
                      <Input
                        id="login-email"
                        type="email"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        placeholder="أدخل بريدك الإلكتروني"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">كلمة المرور</Label>
                      <Input
                        id="login-password"
                        type="password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        placeholder="أدخل كلمة المرور"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={authLoading}>
                      {authLoading ? "جاري تسجيل الدخول..." : "دخول"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={signupDialogOpen} onOpenChange={setSignupDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-gradient-to-r from-primary to-accent">
                    <UserPlus className="h-4 w-4" />
                    إنشاء حساب
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-center">إنشاء حساب جديد</DialogTitle>
                    <DialogDescription className="text-center">
                      انضم إلى نظام إدارة الوكالات
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">الاسم الكامل</Label>
                      <Input
                        id="signup-name"
                        value={signupForm.fullName}
                        onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                        placeholder="أدخل اسمك الكامل"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">البريد الإلكتروني</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        placeholder="أدخل بريدك الإلكتروني"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">كلمة المرور</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        value={signupForm.password}
                        onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                        placeholder="أدخل كلمة المرور"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm">تأكيد كلمة المرور</Label>
                      <Input
                        id="signup-confirm"
                        type="password"
                        value={signupForm.confirmPassword}
                        onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                        placeholder="أعد إدخال كلمة المرور"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={authLoading}>
                      {authLoading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10"></div>
        <div className="relative max-w-6xl mx-auto">
          <div className="animate-fade-in">
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-2xl flex items-center justify-center animate-scale-in">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div className="text-right">
                <h1 className="text-5xl md:text-7xl font-black bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  نظام إدارة الوكالات
                </h1>
                <p className="text-xl text-muted-foreground font-semibold">
                  للدعاية والإعلان المتقدم
                </p>
              </div>
            </div>
            
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-6 leading-relaxed">
              الحل الشامل والمتكامل لإدارة وكالات الدعاية والإعلان
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              منصة متطورة تجمع كل ما تحتاجه لإدارة وكالتك بكفاءة عالية مع أحدث التقنيات والأدوات المتقدمة
            </p>
            
            {/* Video Section */}
            <div className="relative max-w-4xl mx-auto mb-12 hover-scale">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl border-2 border-border/50 backdrop-blur-sm flex items-center justify-center group cursor-pointer overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5"></div>
                <div className="relative text-center z-10">
                  <div className="w-24 h-24 bg-white/90 rounded-full flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                    <Play className="h-10 w-10 text-primary ml-2" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">شاهد النظام في العمل</h3>
                  <p className="text-muted-foreground text-lg">تعرف على جميع المميزات وطرق الاستخدام المتقدمة</p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-primary to-accent text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl hover-scale"
                onClick={() => setSignupDialogOpen(true)}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                ابدأ تجربتك المجانية
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="px-8 py-4 text-lg font-semibold rounded-xl border-2 hover:bg-primary/5"
                onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Eye className="mr-2 h-5 w-5" />
                استكشف الباقات
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl font-bold mb-6">لماذا تختار نظامنا؟</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              مميزات متطورة وحلول ذكية لجعل إدارة وكالتك أكثر فعالية ونجاحاً
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Users className="h-10 w-10 text-primary" />,
                title: "إدارة متعددة الوكالات",
                description: "إدارة عدة وكالات من حساب واحد مع نظام صلاحيات متقدم",
                color: "from-blue-500/10 to-primary/10"
              },
              {
                icon: <Shield className="h-10 w-10 text-accent" />,
                title: "أمان عالي المستوى",
                description: "حماية بيانات العملاء والمشاريع بأحدث معايير الأمان العالمية",
                color: "from-green-500/10 to-accent/10"
              },
              {
                icon: <BarChart3 className="h-10 w-10 text-primary" />,
                title: "تقارير وإحصائيات متقدمة",
                description: "تقارير شاملة ومفصلة لمتابعة أداء وكالتك ونموها",
                color: "from-purple-500/10 to-primary/10"
              },
              {
                icon: <MessageSquare className="h-10 w-10 text-accent" />,
                title: "إدارة التواصل المتكاملة",
                description: "نظام واتساب متطور وإدارة رسائل العملاء والمتابعة",
                color: "from-green-500/10 to-accent/10"
              },
              {
                icon: <FileText className="h-10 w-10 text-primary" />,
                title: "إدارة الفواتير والحسابات",
                description: "نظام محاسبي متكامل مع إدارة الفواتير والمدفوعات",
                color: "from-orange-500/10 to-primary/10"
              },
              {
                icon: <Globe className="h-10 w-10 text-accent" />,
                title: "واجهة عصرية وسهلة",
                description: "تصميم متجاوب وسهل الاستخدام يناسب جميع الأجهزة",
                color: "from-indigo-500/10 to-accent/10"
              }
            ].map((feature, index) => (
              <Card key={index} className={`border-0 bg-gradient-to-br ${feature.color} backdrop-blur-sm hover-scale animate-fade-in transition-all duration-300`} style={{ animationDelay: `${index * 0.1}s` }}>
                <CardContent className="p-8 text-center">
                  <div className="mb-6">
                    {feature.icon}
                  </div>
                  <h3 className="font-bold text-xl mb-4">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Plans */}
      <section id="plans" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">اختر الباقة المناسبة لوكالتك</h2>
            <p className="text-xl text-muted-foreground">باقات مرنة ومتنوعة تناسب جميع أحجام الوكالات</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <Card 
                key={plan.id}
                className={`relative border-2 transition-all duration-500 hover:scale-105 animate-fade-in ${
                  plan.is_popular 
                    ? 'border-primary bg-gradient-to-br from-primary/5 to-accent/5 shadow-xl' 
                    : 'border-border hover:border-primary/50 hover:shadow-lg'
                }`}
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {plan.is_popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-primary to-accent text-white px-6 py-2 text-sm font-bold shadow-lg">
                      <Crown className="h-4 w-4 mr-1" />
                      الأكثر شعبية
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-6 pt-8">
                  <div className="mb-6">
                    {getPlanIcon(plan.name)}
                  </div>
                  <CardTitle className="text-2xl mb-3">{plan.name_ar}</CardTitle>
                  <CardDescription className="text-base mb-6 leading-relaxed">
                    {plan.description_ar}
                  </CardDescription>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-black text-primary">{plan.price}</span>
                    <div className="text-right">
                      <span className="text-muted-foreground text-lg">ريال سعودي</span>
                      <br />
                      <span className="text-sm text-muted-foreground">/شهر</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">الوكالات</span>
                      <Badge variant="secondary">{plan.max_agencies}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">المستخدمين</span>
                      <Badge variant="secondary">{plan.max_users_per_agency}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">العملاء</span>
                      <Badge variant="secondary">
                        {plan.max_customers_per_agency === 2000 ? 'غير محدود' : plan.max_customers_per_agency}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">الطلبات</span>
                      <Badge variant="secondary">
                        {plan.max_orders_per_month === 1000 ? 'غير محدود' : plan.max_orders_per_month}
                      </Badge>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <p className="font-semibold mb-4 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      المميزات المتضمنة:
                    </p>
                    <ul className="space-y-3">
                      {plan.features_ar.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-3 text-sm">
                          <Check className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                          <span className="leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>

                <CardContent className="pt-0">
                  <Button 
                    className={`w-full h-12 text-base font-bold rounded-xl transition-all duration-300 ${
                      plan.is_popular 
                        ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg hover:shadow-xl' 
                        : 'border-2 border-primary text-primary hover:bg-primary hover:text-white'
                    }`}
                    variant={plan.is_popular ? "default" : "outline"}
                    onClick={() => handleSubscribe(plan.id)}
                  >
                    <Rocket className="mr-2 h-5 w-5" />
                    اشترك الآن
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How to Subscribe */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">كيفية الاشتراك في دقائق</h2>
            <p className="text-xl text-muted-foreground">خطوات بسيطة للبدء مع نظام إدارة الوكالات</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                icon: <UserPlus className="h-8 w-8" />,
                title: "إنشاء حساب",
                description: "سجل بياناتك الأساسية وأنشئ حسابك المجاني"
              },
              {
                step: "2", 
                icon: <Target className="h-8 w-8" />,
                title: "اختيار الباقة",
                description: "اختر الباقة التي تناسب حجم وكالتك واحتياجاتك"
              },
              {
                step: "3",
                icon: <CreditCard className="h-8 w-8" />,
                title: "إتمام الدفع",
                description: "ادفع بأمان باستخدام بطاقتك الائتمانية أو التحويل البنكي"
              },
              {
                step: "4",
                icon: <Rocket className="h-8 w-8" />,
                title: "البدء فوراً",
                description: "ابدأ باستخدام جميع مميزات النظام فور التفعيل"
              }
            ].map((step, index) => (
              <Card key={index} className="text-center border-0 bg-card/50 backdrop-blur-sm hover-scale animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardContent className="p-8">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center mx-auto text-white shadow-lg">
                      {step.icon}
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-accent to-primary rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
                      {step.step}
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-primary to-accent text-white px-10 py-4 text-lg font-bold rounded-xl shadow-lg hover:shadow-xl hover-scale"
              onClick={() => setSignupDialogOpen(true)}
            >
              <Heart className="mr-2 h-5 w-5" />
              ابدأ رحلتك معنا الآن
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">الأسئلة الشائعة</h2>
            <p className="text-xl text-muted-foreground">إجابات سريعة على أهم الأسئلة</p>
          </div>
          
          <div className="grid gap-6">
            {[
              {
                question: "هل يمكنني تغيير الباقة لاحقاً؟",
                answer: "نعم، يمكنك ترقية أو تخفيض باقتك في أي وقت. سيتم احتساب الفرق في التكلفة تلقائياً وتطبيق التغييرات فوراً."
              },
              {
                question: "هل توجد فترة تجريبية مجانية؟",
                answer: "نعم، نقدم فترة تجريبية مجانية لمدة 14 يوم لجميع الباقات لتجربة النظام واكتشاف جميع المميزات."
              },
              {
                question: "هل يمكنني إلغاء الاشتراك في أي وقت؟",
                answer: "نعم، يمكنك إلغاء اشتراكك في أي وقت دون أي رسوم إضافية. ستحتفظ بالوصول حتى نهاية فترة الاشتراك المدفوعة."
              },
              {
                question: "هل النظام يدعم اللغة العربية بالكامل؟",
                answer: "نعم، النظام مصمم خصيصاً للسوق العربي ويدعم اللغة العربية بالكامل في جميع أجزاء النظام والتقارير."
              },
              {
                question: "ما نوع الدعم الفني المتاح؟",
                answer: "نقدم دعم فني متخصص عبر الهاتف والبريد الإلكتروني والدردشة المباشرة، بالإضافة إلى مكتبة شاملة من الفيديوهات التعليمية."
              }
            ].map((faq, index) => (
              <Card key={index} className="hover-scale animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center text-white text-sm font-bold">
                      ?
                    </div>
                    {faq.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed mr-11">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">تحتاج مساعدة؟</h2>
          <p className="text-xl text-muted-foreground mb-8">
            فريقنا المتخصص جاهز لمساعدتك في أي استفسار
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-0 bg-card/50 backdrop-blur-sm hover-scale">
              <CardContent className="p-6 text-center">
                <Phone className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">اتصل بنا</h3>
                <p className="text-muted-foreground">920000000</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 bg-card/50 backdrop-blur-sm hover-scale">
              <CardContent className="p-6 text-center">
                <Mail className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">راسلنا</h3>
                <p className="text-muted-foreground">support@agency-system.com</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 bg-card/50 backdrop-blur-sm hover-scale">
              <CardContent className="p-6 text-center">
                <MessageSquare className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">دردشة مباشرة</h3>
                <p className="text-muted-foreground">متاح على مدار الساعة</p>
              </CardContent>
            </Card>
          </div>
          
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-primary to-accent text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl hover-scale"
          >
            <Headphones className="mr-2 h-5 w-5" />
            تواصل معنا الآن
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">نظام إدارة الوكالات</h3>
                  <p className="text-sm text-muted-foreground">للدعاية والإعلان</p>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                الحل الشامل والمتطور لإدارة وكالات الدعاية والإعلان بكفاءة عالية ونتائج مضمونة.
              </p>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer">
                  <Globe className="h-5 w-5" />
                </div>
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer">
                  <Phone className="h-5 w-5" />
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">روابط سريعة</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors story-link">الرئيسية</a></li>
                <li><a href="#plans" className="hover:text-primary transition-colors story-link">الباقات</a></li>
                <li><a href="#" className="hover:text-primary transition-colors story-link">المميزات</a></li>
                <li><a href="#" className="hover:text-primary transition-colors story-link">تواصل معنا</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">معلومات مهمة</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors story-link">سياسة الخصوصية</a></li>
                <li><a href="#" className="hover:text-primary transition-colors story-link">شروط الاستخدام</a></li>
                <li><a href="#" className="hover:text-primary transition-colors story-link">دليل الاستخدام</a></li>
                <li><a href="#" className="hover:text-primary transition-colors story-link">الدعم الفني</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>© 2024 نظام إدارة الوكالات. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CustomerPortal;