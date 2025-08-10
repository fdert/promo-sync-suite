import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Plus, Edit, Trash2, Users, Building, Star } from "lucide-react";
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
  sort_order?: number;
  created_at: string;
}

const SubscriptionPlans = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('حدث خطأ في جلب خطط الاشتراك');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async (planData: Partial<SubscriptionPlan>) => {
    try {
      if (editingPlan) {
        // تحديث خطة موجودة
        const { error } = await supabase
          .from('subscription_plans')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) throw error;
        toast.success('تم تحديث الخطة بنجاح');
      } else {
        // إضافة خطة جديدة
        const { error } = await supabase
          .from('subscription_plans')
          .insert(planData as any);

        if (error) throw error;
        toast.success('تم إضافة الخطة بنجاح');
      }

      setIsDialogOpen(false);
      setEditingPlan(null);
      fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('حدث خطأ في حفظ الخطة');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الخطة؟')) return;

    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      toast.success('تم حذف الخطة بنجاح');
      fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('حدث خطأ في حذف الخطة');
    }
  };

  const togglePlanStatus = async (planId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ is_active: !currentStatus })
        .eq('id', planId);

      if (error) throw error;
      toast.success(`تم ${!currentStatus ? 'تفعيل' : 'إلغاء تفعيل'} الخطة بنجاح`);
      fetchPlans();
    } catch (error) {
      console.error('Error updating plan status:', error);
      toast.error('حدث خطأ في تحديث حالة الخطة');
    }
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
        <div>
          <h1 className="text-3xl font-bold">إدارة خطط الاشتراك</h1>
          <p className="text-muted-foreground">إدارة خطط الاشتراك والتسعير</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPlan(null)}>
              <Plus className="h-4 w-4 mr-2" />
              إضافة خطة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? 'تعديل خطة الاشتراك' : 'إضافة خطة اشتراك جديدة'}
              </DialogTitle>
            </DialogHeader>
            <PlanForm plan={editingPlan} onSave={handleSavePlan} />
          </DialogContent>
        </Dialog>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الخطط</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الخطط النشطة</CardTitle>
            <Building className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {plans.filter(p => p.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الخطة الأكثر شعبية</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {plans.filter(p => p.is_popular).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط السعر</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {plans.length > 0 ? Math.round(plans.reduce((sum, p) => sum + p.price, 0) / plans.length) : 0} ر.س
            </div>
          </CardContent>
        </Card>
      </div>

      {/* قائمة الخطط */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة خطط الاشتراك</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الخطة</TableHead>
                <TableHead>السعر</TableHead>
                <TableHead>دورة الدفع</TableHead>
                <TableHead>المستخدمين</TableHead>
                <TableHead>الطلبات/شهر</TableHead>
                <TableHead>التخزين</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{plan.name_ar}</span>
                      {plan.is_popular && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{plan.price} ر.س</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {plan.billing_period === 'monthly' ? 'شهري' : 'سنوي'}
                    </Badge>
                  </TableCell>
                  <TableCell>{plan.max_users_per_agency}</TableCell>
                  <TableCell>{plan.max_orders_per_month}</TableCell>
                  <TableCell>{plan.max_storage_gb} GB</TableCell>
                  <TableCell>
                    <Badge variant={plan.is_active ? "default" : "secondary"}>
                      {plan.is_active ? "نشط" : "غير نشط"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingPlan(plan);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={plan.is_active ? "destructive" : "default"}
                        size="sm"
                        onClick={() => togglePlanStatus(plan.id, plan.is_active)}
                      >
                        {plan.is_active ? 'إلغاء تفعيل' : 'تفعيل'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeletePlan(plan.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

interface PlanFormProps {
  plan: SubscriptionPlan | null;
  onSave: (data: Partial<SubscriptionPlan>) => void;
}

const PlanForm = ({ plan, onSave }: PlanFormProps) => {
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    name_ar: plan?.name_ar || '',
    description: plan?.description || '',
    price: plan?.price || 0,
    billing_period: plan?.billing_period || 'monthly',
    max_users_per_agency: plan?.max_users_per_agency || 5,
    max_orders_per_month: plan?.max_orders_per_month || 100,
    max_storage_gb: plan?.max_storage_gb || 5,
    is_active: plan?.is_active ?? true,
    is_popular: plan?.is_popular ?? false,
    sort_order: plan?.sort_order || 1,
    features: plan?.features || []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">اسم الخطة (بالإنجليزية)</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="name_ar">اسم الخطة (بالعربية)</Label>
          <Input
            id="name_ar"
            value={formData.name_ar}
            onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">الوصف</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price">السعر (ر.س)</Label>
          <Input
            id="price"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
            required
          />
        </div>
        <div>
          <Label htmlFor="billing_period">دورة الدفع</Label>
          <select
            id="billing_period"
            value={formData.billing_period}
            onChange={(e) => setFormData({ ...formData, billing_period: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="monthly">شهري</option>
            <option value="yearly">سنوي</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="max_users">عدد المستخدمين</Label>
          <Input
            id="max_users"
            type="number"
            value={formData.max_users_per_agency}
            onChange={(e) => setFormData({ ...formData, max_users_per_agency: Number(e.target.value) })}
            required
          />
        </div>
        <div>
          <Label htmlFor="max_orders">الطلبات/شهر</Label>
          <Input
            id="max_orders"
            type="number"
            value={formData.max_orders_per_month}
            onChange={(e) => setFormData({ ...formData, max_orders_per_month: Number(e.target.value) })}
            required
          />
        </div>
        <div>
          <Label htmlFor="storage">التخزين (GB)</Label>
          <Input
            id="storage"
            type="number"
            value={formData.max_storage_gb}
            onChange={(e) => setFormData({ ...formData, max_storage_gb: Number(e.target.value) })}
            required
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Switch
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label>نشط</Label>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Switch
            checked={formData.is_popular}
            onCheckedChange={(checked) => setFormData({ ...formData, is_popular: checked })}
          />
          <Label>الأكثر شعبية</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit">
          {plan ? 'تحديث الخطة' : 'إضافة الخطة'}
        </Button>
      </div>
    </form>
  );
};

export default SubscriptionPlans;