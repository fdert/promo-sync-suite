import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Plus, FileText, Download } from "lucide-react";
import CreateInstallmentPlan from "@/components/installments/CreateInstallmentPlan";
import InstallmentPlanDetails from "@/components/installments/InstallmentPlanDetails";
import InstallmentPlanExport from "@/components/installments/InstallmentPlanExport";

const InstallmentPlans = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // جلب خطط الأقساط
  const { data: plans, isLoading, refetch } = useQuery({
    queryKey: ['installment-plans', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('installment_plans_summary')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`customer_name.ilike.%${searchTerm}%,order_number.ilike.%${searchTerm}%,customer_phone.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: any = {
      active: "bg-success/10 text-success",
      completed: "bg-primary/10 text-primary",
      overdue: "bg-destructive/10 text-destructive",
      cancelled: "bg-muted text-muted-foreground"
    };
    
    const labels: any = {
      active: "نشط",
      completed: "مكتمل",
      overdue: "متأخر",
      cancelled: "ملغي"
    };

    return (
      <Badge className={variants[status] || "bg-muted"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const handlePlanCreated = () => {
    setShowCreateDialog(false);
    refetch();
    toast({
      title: "تم إنشاء خطة التقسيط",
      description: "تم إنشاء خطة التقسيط وإرسال التفاصيل للعميل بنجاح",
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة الأقساط</h1>
          <p className="text-muted-foreground">إدارة خطط التقسيط والدفعات</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إنشاء خطة تقسيط جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إنشاء خطة تقسيط جديدة</DialogTitle>
            </DialogHeader>
            <CreateInstallmentPlan onSuccess={handlePlanCreated} />
          </DialogContent>
        </Dialog>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">إجمالي الخطط</div>
            <div className="text-2xl font-bold">{plans?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">خطط نشطة</div>
            <div className="text-2xl font-bold text-success">
              {plans?.filter(p => p.plan_status === 'active').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">خطط متأخرة</div>
            <div className="text-2xl font-bold text-destructive">
              {plans?.filter(p => p.plan_status === 'overdue').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">إجمالي المبالغ</div>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(plans?.reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* البحث والفلاتر */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث باسم العميل أو رقم الطلب أو رقم الجوال..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <InstallmentPlanExport plans={plans || []} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : plans && plans.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>اسم العميل</TableHead>
                  <TableHead>رقم الجوال</TableHead>
                  <TableHead>إجمالي المبلغ</TableHead>
                  <TableHead>المدفوع</TableHead>
                  <TableHead>المتبقي</TableHead>
                  <TableHead>عدد الأقساط</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.order_number}</TableCell>
                    <TableCell>{plan.customer_name}</TableCell>
                    <TableCell>{plan.customer_phone || plan.customer_whatsapp}</TableCell>
                    <TableCell>{formatCurrency(plan.total_amount)}</TableCell>
                    <TableCell className="text-success">{formatCurrency(plan.total_paid)}</TableCell>
                    <TableCell className="text-warning">{formatCurrency(plan.remaining_amount)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 text-sm">
                        <span className="text-success">{plan.paid_installments}</span>
                        <span className="text-muted-foreground">/</span>
                        <span>{plan.number_of_installments}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(plan.plan_status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPlan(plan);
                          setShowDetailsDialog(true);
                        }}
                      >
                        <FileText className="h-4 w-4 ml-2" />
                        التفاصيل
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد خطط تقسيط {searchTerm && 'مطابقة للبحث'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* نافذة تفاصيل الخطة */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل خطة التقسيط</DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <InstallmentPlanDetails 
              planId={selectedPlan.id} 
              onUpdate={refetch}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstallmentPlans;