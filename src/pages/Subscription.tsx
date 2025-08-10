import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Play, Users, Building2, Zap, Shield, Headphones, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

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
  features_ar: any;
  is_popular: boolean;
  is_active: boolean;
}

const Subscription = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchPlans();
  }, []);

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
        features_ar: Array.isArray(plan.features_ar) ? plan.features_ar : []
      }));
      setPlans(formattedPlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: "خطأ في تحميل الباقات",
        description: "حدث خطأ أثناء تحميل باقات الاشتراك",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "يرجى تسجيل الدخول أولاً للاشتراك في الباقة",
        variant: "destructive",
      });
      return;
    }

    setProcessingPlan(planId);
    
    try {
      // سيتم ربط هذا مع Stripe لاحقاً
      toast({
        title: "قريباً!",
        description: "سيتم تفعيل نظام الدفع قريباً",
      });
    } catch (error) {
      console.error('Error subscribing:', error);
      toast({
        title: "خطأ في الاشتراك",
        description: "حدث خطأ أثناء معالجة الاشتراك",
        variant: "destructive",
      });
    } finally {
      setProcessingPlan(null);
    }
  };

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'Starter':
        return <Zap className="h-8 w-8 text-primary" />;
      case 'Professional':
        return <Building2 className="h-8 w-8 text-primary" />;
      case 'Enterprise':
        return <Globe className="h-8 w-8 text-primary" />;
      default:
        return <Star className="h-8 w-8 text-primary" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">جاري تحميل الباقات...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header Section */}
      <section className="relative py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Building2 className="h-12 w-12 text-primary" />
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              نظام إدارة وكالات الدعاية والإعلان
            </h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            الحل الشامل لإدارة وكالات الدعاية والإعلان بأحدث التقنيات والأدوات المتقدمة
          </p>
          
          {/* Video Section */}
          <div className="relative max-w-3xl mx-auto mb-12">
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl border border-border/50 backdrop-blur-sm flex items-center justify-center group cursor-pointer hover:scale-105 transition-transform duration-300">
              <div className="text-center">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <Play className="h-8 w-8 text-primary-foreground ml-1" />
                </div>
                <h3 className="text-xl font-semibold mb-2">شاهد النظام في العمل</h3>
                <p className="text-muted-foreground">تعرف على جميع المميزات وطرق الاستخدام</p>
              </div>
            </div>
          </div>

          {/* Features Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <Users className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">إدارة متعددة الوكالات</h3>
                <p className="text-sm text-muted-foreground">إدارة عدة وكالات من حساب واحد</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <Shield className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">أمان عالي المستوى</h3>
                <p className="text-sm text-muted-foreground">حماية بيانات العملاء والمشاريع</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <Headphones className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">دعم فني متخصص</h3>
                <p className="text-sm text-muted-foreground">فريق دعم فني متاح على مدار الساعة</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">اختر الباقة المناسبة لوكالتك</h2>
            <p className="text-muted-foreground">باقات مرنة تناسب جميع أحجام الوكالات</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative border-2 transition-all duration-300 hover:scale-105 ${
                  plan.is_popular 
                    ? 'border-primary bg-gradient-to-br from-primary/5 to-accent/5' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {plan.is_popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      الأكثر شعبية
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-6">
                  <div className="mb-4">
                    {getPlanIcon(plan.name)}
                  </div>
                  <CardTitle className="text-2xl mb-2">{plan.name_ar}</CardTitle>
                  <CardDescription className="text-base mb-4">
                    {plan.description_ar}
                  </CardDescription>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground mr-2">ريال سعودي</span>
                    <span className="text-sm text-muted-foreground">/شهر</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>عدد الوكالات</span>
                      <span className="font-medium">{plan.max_agencies}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>المستخدمين لكل وكالة</span>
                      <span className="font-medium">{plan.max_users_per_agency}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>العملاء لكل وكالة</span>
                      <span className="font-medium">
                        {plan.max_customers_per_agency === 2000 ? 'غير محدود' : plan.max_customers_per_agency}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>الطلبات الشهرية</span>
                      <span className="font-medium">
                        {plan.max_orders_per_month === 1000 ? 'غير محدود' : plan.max_orders_per_month}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>مساحة التخزين</span>
                      <span className="font-medium">{plan.max_storage_gb} جيجا</span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="font-medium mb-3">المميزات:</p>
                    <ul className="space-y-2">
                      {plan.features_ar.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={plan.is_popular ? "default" : "outline"}
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={processingPlan === plan.id}
                  >
                    {processingPlan === plan.id ? 'جاري المعالجة...' : 'اشترك الآن'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              تحتاج مساعدة في اختيار الباقة المناسبة؟
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" asChild>
                <Link to="/agency-login">دخول الوكالة</Link>
              </Button>
              <Button asChild>
                <Link to="/auth">إنشاء حساب جديد</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">الأسئلة الشائعة</h2>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">هل يمكنني تغيير الباقة لاحقاً؟</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  نعم، يمكنك ترقية أو تخفيض باقتك في أي وقت. سيتم احتساب الفرق في التكلفة.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">هل توجد فترة تجريبية مجانية؟</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  نعم، نقدم فترة تجريبية مجانية لمدة 14 يوم لجميع الباقات لتجربة النظام.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">هل يمكنني إلغاء الاشتراك في أي وقت؟</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  نعم، يمكنك إلغاء اشتراكك في أي وقت دون أي رسوم إضافية.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Subscription;