import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Star, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  CreditCard, 
  Package, 
  Building2,
  Check,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  features: string[];
  features_ar: string[];
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
}

interface Subscription {
  id: string;
  agency_id: string;
  plan_id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  plan?: SubscriptionPlan;
}

const SubscriptionManagement = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const { toast } = useToast();

  const [planForm, setPlanForm] = useState({
    name: "",
    name_ar: "",
    description: "",
    description_ar: "",
    price: 0,
    billing_period: "month",
    max_agencies: 1,
    max_users_per_agency: 5,
    max_customers_per_agency: 100,
    max_orders_per_month: 50,
    max_storage_gb: 5,
    features: "",
    features_ar: "",
    is_popular: false,
    is_active: true,
    sort_order: 1
  });

  useEffect(() => {
    fetchPlans();
    fetchSubscriptions();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      
      const formattedPlans = (data || []).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features.map(f => String(f)) : [],
        features_ar: Array.isArray(plan.features_ar) ? plan.features_ar.map(f => String(f)) : []
      }));
      setPlans(formattedPlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: "خطأ في تحميل الباقات",
        description: "حدث خطأ أثناء تحميل باقات الاشتراك",
        variant: "destructive",
      });
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedSubscriptions = (data || []).map(sub => ({
        ...sub,
        plan: sub.plan ? {
          ...sub.plan,
          features: Array.isArray(sub.plan.features) ? sub.plan.features.map(f => String(f)) : [],
          features_ar: Array.isArray(sub.plan.features_ar) ? sub.plan.features_ar.map(f => String(f)) : []
        } : undefined
      }));
      setSubscriptions(formattedSubscriptions);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const planData = {
        ...planForm,
        features: planForm.features.split('\n').filter(f => f.trim()),
        features_ar: planForm.features_ar.split('\n').filter(f => f.trim()),
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) throw error;
        toast({
          title: "تم تحديث الباقة بنجاح",
          description: "تم تحديث باقة الاشتراك بنجاح",
        });
      } else {
        const { error } = await supabase
          .from('subscription_plans')
          .insert(planData);

        if (error) throw error;
        toast({
          title: "تم إنشاء الباقة بنجاح",
          description: "تم إنشاء باقة اشتراك جديدة بنجاح",
        });
      }

      resetForm();
      setDialogOpen(false);
      fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({
        title: "خطأ في حفظ الباقة",
        description: "حدث خطأ أثناء حفظ باقة الاشتراك",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      name_ar: plan.name_ar,
      description: plan.description,
      description_ar: plan.description_ar,
      price: plan.price,
      billing_period: plan.billing_period,
      max_agencies: plan.max_agencies,
      max_users_per_agency: plan.max_users_per_agency,
      max_customers_per_agency: plan.max_customers_per_agency,
      max_orders_per_month: plan.max_orders_per_month,
      max_storage_gb: plan.max_storage_gb,
      features: plan.features?.join('\n') || "",
      features_ar: plan.features_ar?.join('\n') || "",
      is_popular: plan.is_popular,
      is_active: plan.is_active,
      sort_order: plan.sort_order
    });
    setDialogOpen(true);
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الباقة؟')) return;

    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      
      toast({
        title: "تم حذف الباقة",
        description: "تم حذف باقة الاشتراك بنجاح",
      });
      
      fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast({
        title: "خطأ في حذف الباقة",
        description: "حدث خطأ أثناء حذف باقة الاشتراك",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setPlanForm({
      name: "",
      name_ar: "",
      description: "",
      description_ar: "",
      price: 0,
      billing_period: "month",
      max_agencies: 1,
      max_users_per_agency: 5,
      max_customers_per_agency: 100,
      max_orders_per_month: 50,
      max_storage_gb: 5,
      features: "",
      features_ar: "",
      is_popular: false,
      is_active: true,
      sort_order: 1
    });
    setEditingPlan(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">جاري تحميل البيانات...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة الباقات والاشتراكات</h1>
          <p className="text-muted-foreground">إدارة باقات الاشتراك ومتابعة اشتراكات العملاء</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة باقة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? 'تعديل باقة الاشتراك' : 'إضافة باقة اشتراك جديدة'}
              </DialogTitle>
              <DialogDescription>
                أدخل تفاصيل باقة الاشتراك
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">الاسم (إنجليزي)</Label>
                  <Input
                    id="name"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_ar">الاسم (عربي)</Label>
                  <Input
                    id="name_ar"
                    value={planForm.name_ar}
                    onChange={(e) => setPlanForm({ ...planForm, name_ar: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="description">الوصف (إنجليزي)</Label>
                  <Textarea
                    id="description"
                    value={planForm.description}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description_ar">الوصف (عربي)</Label>
                  <Textarea
                    id="description_ar"
                    value={planForm.description_ar}
                    onChange={(e) => setPlanForm({ ...planForm, description_ar: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">السعر (ريال سعودي)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing_period">فترة الدفع</Label>
                  <select
                    id="billing_period"
                    value={planForm.billing_period}
                    onChange={(e) => setPlanForm({ ...planForm, billing_period: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-md"
                  >
                    <option value="month">شهري</option>
                    <option value="year">سنوي</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sort_order">ترتيب العرض</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={planForm.sort_order}
                    onChange={(e) => setPlanForm({ ...planForm, sort_order: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_agencies">عدد الوكالات</Label>
                  <Input
                    id="max_agencies"
                    type="number"
                    value={planForm.max_agencies}
                    onChange={(e) => setPlanForm({ ...planForm, max_agencies: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_users_per_agency">المستخدمين لكل وكالة</Label>
                  <Input
                    id="max_users_per_agency"
                    type="number"
                    value={planForm.max_users_per_agency}
                    onChange={(e) => setPlanForm({ ...planForm, max_users_per_agency: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_customers_per_agency">العملاء لكل وكالة</Label>
                  <Input
                    id="max_customers_per_agency"
                    type="number"
                    value={planForm.max_customers_per_agency}
                    onChange={(e) => setPlanForm({ ...planForm, max_customers_per_agency: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_orders_per_month">الطلبات الشهرية</Label>
                  <Input
                    id="max_orders_per_month"
                    type="number"
                    value={planForm.max_orders_per_month}
                    onChange={(e) => setPlanForm({ ...planForm, max_orders_per_month: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_storage_gb">مساحة التخزين (جيجا)</Label>
                <Input
                  id="max_storage_gb"
                  type="number"
                  value={planForm.max_storage_gb}
                  onChange={(e) => setPlanForm({ ...planForm, max_storage_gb: Number(e.target.value) })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="features">المميزات (إنجليزي) - سطر لكل ميزة</Label>
                  <Textarea
                    id="features"
                    value={planForm.features}
                    onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                    rows={5}
                    placeholder="ميزة واحدة في كل سطر"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="features_ar">المميزات (عربي) - سطر لكل ميزة</Label>
                  <Textarea
                    id="features_ar"
                    value={planForm.features_ar}
                    onChange={(e) => setPlanForm({ ...planForm, features_ar: e.target.value })}
                    rows={5}
                    placeholder="ميزة واحدة في كل سطر"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch
                    id="is_popular"
                    checked={planForm.is_popular}
                    onCheckedChange={(checked) => setPlanForm({ ...planForm, is_popular: checked })}
                  />
                  <Label htmlFor="is_popular">باقة شائعة</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch
                    id="is_active"
                    checked={planForm.is_active}
                    onCheckedChange={(checked) => setPlanForm({ ...planForm, is_active: checked })}
                  />
                  <Label htmlFor="is_active">باقة نشطة</Label>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={loading}>
                  {editingPlan ? 'تحديث' : 'إضافة'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans" className="gap-2">
            <Package className="h-4 w-4" />
            الباقات
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-2">
            <Users className="h-4 w-4" />
            الاشتراكات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.is_popular ? 'ring-2 ring-primary' : ''}`}>
                {plan.is_popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Star className="h-3 w-3 mr-1" />
                      الأكثر شعبية
                    </Badge>
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{plan.name_ar}</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(plan)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(plan.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{plan.description_ar}</CardDescription>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">ريال/شهر</span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>الوكالات:</span>
                      <span className="font-medium">{plan.max_agencies}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>المستخدمين:</span>
                      <span className="font-medium">{plan.max_users_per_agency}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>العملاء:</span>
                      <span className="font-medium">{plan.max_customers_per_agency}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>الطلبات الشهرية:</span>
                      <span className="font-medium">{plan.max_orders_per_month}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>مساحة التخزين:</span>
                      <span className="font-medium">{plan.max_storage_gb} جيجا</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {plan.is_active ? (
                      <Badge variant="default" className="gap-1">
                        <Check className="h-3 w-3" />
                        نشطة
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <X className="h-3 w-3" />
                        معطلة
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                الاشتراكات النشطة
              </CardTitle>
              <CardDescription>
                متابعة جميع اشتراكات العملاء في النظام
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الباقة</TableHead>
                    <TableHead>الوكالة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>تاريخ البداية</TableHead>
                    <TableHead>تاريخ الانتهاء</TableHead>
                    <TableHead>Stripe ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell>
                        {subscription.plan?.name_ar || 'غير محدد'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {subscription.agency_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={subscription.status === 'active' ? 'default' : 'secondary'}
                        >
                          {subscription.status === 'active' ? 'نشط' : subscription.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(subscription.starts_at).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell>
                        {new Date(subscription.ends_at).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {subscription.stripe_subscription_id || 'غير مربوط'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SubscriptionManagement;