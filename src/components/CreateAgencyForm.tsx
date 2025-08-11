import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, User, Mail, Phone, MapPin, Globe, Star, Check } from "lucide-react";
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
  const navigate = useNavigate();
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

  const createAgencyWithSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) {
      toast.error('يرجى اختيار خطة اشتراك');
      return;
    }

    setLoading(true);
    try {
      // إنشاء الوكالة
      const { data: agencyData, error: agencyError } = await supabase
        .from('agencies')
        .insert({
          ...formData,
          is_active: true,
          subscription_plan: selectedPlan,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (agencyError) throw agencyError;

      // إنشاء اشتراك نشط للوكالة
      const selectedPlanData = plans.find(p => p.id === selectedPlan);
      if (selectedPlanData) {
        const subscriptionEndDate = new Date();
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 
          (selectedPlanData.billing_period === 'yearly' ? 12 : 1));

        await supabase
          .from('subscriptions')
          .insert({
            agency_id: agencyData.id,
            plan_id: selectedPlan,
            status: 'active',
            starts_at: new Date().toISOString(),
            ends_at: subscriptionEndDate.toISOString()
          });
      }

      // إضافة المستخدم الحالي كمالك للوكالة
      await supabase
        .from('agency_members')
        .insert({
          agency_id: agencyData.id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          role: 'owner'
        });

      toast.success('تم إنشاء الوكالة وتفعيل الاشتراك بنجاح');
      
      // إعادة تحميل الصفحة لتحديث قائمة الوكالات
      window.location.reload();
      
    } catch (error: any) {
      console.error('Error creating agency:', error);
      toast.error(error.message || 'حدث خطأ في إنشاء الوكالة');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  return (
    <form onSubmit={createAgencyWithSubscription} className="space-y-6">
      {/* معلومات الوكالة الأساسية */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <h3 className="text-lg font-semibold">معلومات الوكالة</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
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

        <div className="grid grid-cols-2 gap-4">
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

        <div className="grid grid-cols-2 gap-4">
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
      </div>

      <Separator />

      {/* اختيار خطة الاشتراك */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          <h3 className="text-lg font-semibold">اختيار خطة الاشتراك</h3>
        </div>

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

        {selectedPlanData && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <span>الخطة المختارة:</span>
                <Badge variant="default">{selectedPlanData.name_ar}</Badge>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span>التكلفة الإجمالية:</span>
                <span className="font-bold text-lg">
                  {selectedPlanData.price} ر.س
                  /{selectedPlanData.billing_period === 'monthly' ? 'شهر' : 'سنة'}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="submit"
          disabled={loading || !selectedPlan}
          className="min-w-[200px]"
        >
          {loading ? 'جاري الإنشاء...' : 'إنشاء الوكالة وتفعيل الاشتراك'}
        </Button>
      </div>
    </form>
  );
};

export default CreateAgencyForm;