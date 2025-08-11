import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, CreditCard, Settings, Search, Eye, UserCheck, UserX, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CreateAgencyForm from "@/components/CreateAgencyForm";
import { SendAgencyLoginButton } from "@/components/SendAgencyLoginButton";

interface Agency {
  id: string;
  name: string;
  slug: string;
  contact_email: string;
  contact_phone?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  subscription_status?: string;
  members_count?: number;
  orders_count?: number;
}

const AgenciesManagement = () => {
  const navigate = useNavigate();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [filteredAgencies, setFilteredAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);

  useEffect(() => {
    fetchAgencies();
  }, []);

  useEffect(() => {
    const filtered = agencies.filter(agency =>
      agency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agency.contact_email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAgencies(filtered);
  }, [searchTerm, agencies]);

  const fetchAgencies = async () => {
    try {
      // جلب الوكالات فقط بدون البيانات الإضافية مؤقتاً
      const { data: agenciesData, error } = await supabase
        .from('agencies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Fetched agencies:', agenciesData);

      const processedAgencies = agenciesData?.map(agency => ({
        ...agency,
        members_count: 0, // سيتم جلبها لاحقاً
        orders_count: 0, // سيتم جلبها لاحقاً
        subscription_status: 'inactive' // افتراضي مؤقتاً
      })) || [];

      setAgencies(processedAgencies);
    } catch (error) {
      console.error('Error fetching agencies:', error);
      toast.error('حدث خطأ في جلب بيانات الوكالات');
    } finally {
      setLoading(false);
    }
  };

  const toggleAgencyStatus = async (agencyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('agencies')
        .update({ is_active: !currentStatus })
        .eq('id', agencyId);

      if (error) throw error;

      toast.success(`تم ${!currentStatus ? 'تفعيل' : 'إلغاء تفعيل'} الوكالة بنجاح`);
      fetchAgencies();
    } catch (error) {
      console.error('Error updating agency status:', error);
      toast.error('حدث خطأ في تحديث حالة الوكالة');
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge variant={isActive ? "default" : "secondary"}>
        {isActive ? "نشط" : "غير نشط"}
      </Badge>
    );
  };

  const getSubscriptionBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      inactive: "secondary",
      cancelled: "destructive",
      trial: "outline"
    };

    const labels: Record<string, string> = {
      active: "نشط",
      inactive: "غير نشط",
      cancelled: "ملغي",
      trial: "تجريبي"
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
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
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            رجوع
          </Button>
          <div>
            <h1 className="text-3xl font-bold">إدارة الوكالات</h1>
            <p className="text-muted-foreground">إدارة جميع الوكالات المسجلة في النظام</p>
          </div>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Building2 className="h-4 w-4 mr-2" />
              إنشاء وكالة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إنشاء وكالة جديدة</DialogTitle>
            </DialogHeader>
            <CreateAgencyForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الوكالات</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agencies.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الوكالات النشطة</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {agencies.filter(a => a.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الوكالات المعطلة</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {agencies.filter(a => !a.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الاشتراكات النشطة</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {agencies.filter(a => a.subscription_status === 'active').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* البحث والفلترة */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الوكالات</CardTitle>
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث بالاسم أو البريد الإلكتروني..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الوكالة</TableHead>
                <TableHead>البريد الإلكتروني</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الاشتراك</TableHead>
                <TableHead>عدد الأعضاء</TableHead>
                <TableHead>عدد الطلبات</TableHead>
                <TableHead>تاريخ التسجيل</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgencies.map((agency) => (
                <TableRow key={agency.id}>
                  <TableCell className="font-medium">{agency.name}</TableCell>
                  <TableCell>{agency.contact_email}</TableCell>
                  <TableCell>{getStatusBadge(agency.is_active)}</TableCell>
                  <TableCell>{getSubscriptionBadge(agency.subscription_status || 'inactive')}</TableCell>
                  <TableCell>{agency.members_count}</TableCell>
                  <TableCell>{agency.orders_count}</TableCell>
                  <TableCell>
                    {new Date(agency.created_at).toLocaleDateString('ar-SA')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedAgency(agency)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>تفاصيل الوكالة: {agency.name}</DialogTitle>
                          </DialogHeader>
                          <AgencyDetailsContent agency={selectedAgency} />
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant={agency.is_active ? "destructive" : "default"}
                        size="sm"
                        onClick={() => toggleAgencyStatus(agency.id, agency.is_active)}
                      >
                        {agency.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/admin/agency')}
                        className="flex items-center gap-1"
                      >
                        <Settings className="h-4 w-4" />
                        لوحة التحكم
                      </Button>
                      
                      <SendAgencyLoginButton
                        agencyId={agency.id}
                        agencyName={agency.name}
                        userEmail={agency.contact_email}
                      />
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

const AgencyDetailsContent = ({ agency }: { agency: Agency | null }) => {
  if (!agency) return null;

  return (
    <Tabs defaultValue="info" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="info">المعلومات الأساسية</TabsTrigger>
        <TabsTrigger value="members">الأعضاء</TabsTrigger>
        <TabsTrigger value="subscription">الاشتراك</TabsTrigger>
        <TabsTrigger value="activity">النشاط</TabsTrigger>
      </TabsList>

      <TabsContent value="info" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">اسم الوكالة</h4>
            <p>{agency.name}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">البريد الإلكتروني</h4>
            <p>{agency.contact_email}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">رقم الهاتف</h4>
            <p>{agency.contact_phone || 'غير محدد'}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">الحالة</h4>
            <Badge variant={agency.is_active ? "default" : "secondary"}>
              {agency.is_active ? "نشط" : "غير نشط"}
            </Badge>
          </div>
          <div className="col-span-2">
            <h4 className="font-semibold mb-2">الوصف</h4>
            <p>{agency.description || 'لا يوجد وصف'}</p>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="members">
        <p>سيتم عرض قائمة الأعضاء هنا</p>
      </TabsContent>

      <TabsContent value="subscription">
        <p>سيتم عرض تفاصيل الاشتراك هنا</p>
      </TabsContent>

      <TabsContent value="activity">
        <p>سيتم عرض سجل النشاط هنا</p>
      </TabsContent>
    </Tabs>
  );
};

export default AgenciesManagement;