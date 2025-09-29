import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Settings,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ServiceTypes = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    category: "",
    base_price: "",
    is_active: true
  });

  const { toast } = useToast();

  // جلب الخدمات من قاعدة البيانات
  const fetchServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching services:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في جلب بيانات الخدمات",
          variant: "destructive",
        });
        return;
      }

      setServices(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // تحميل البيانات عند تحميل الصفحة
  useEffect(() => {
    fetchServices();
  }, []);

  const filteredServices = services.filter(service =>
    service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddService = async () => {
    if (!newService.name || !newService.category) {
      toast({
        title: "خطأ",
        description: "يرجى ملء الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('service_types')
        .insert([{
          name: newService.name,
          description: newService.description,
          category: newService.category,
          base_price: newService.base_price ? parseFloat(newService.base_price) : null,
          is_active: newService.is_active
        }]);

      if (error) {
        console.error('Error adding service:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في إضافة الخدمة",
          variant: "destructive",
        });
        return;
      }

      await fetchServices();
      setNewService({
        name: "",
        description: "",
        category: "",
        base_price: "",
        is_active: true
      });
      setIsAddDialogOpen(false);
      
      toast({
        title: "تم إضافة الخدمة",
        description: "تم إضافة الخدمة بنجاح",
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setNewService({
      name: service.name,
      description: service.description || "",
      category: service.category || "",
      base_price: service.base_price?.toString() || "",
      is_active: service.is_active
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateService = async () => {
    if (!newService.name || !newService.category) {
      toast({
        title: "خطأ",
        description: "يرجى ملء الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('service_types')
        .update({
          name: newService.name,
          description: newService.description,
          category: newService.category,
          base_price: newService.base_price ? parseFloat(newService.base_price) : null,
          is_active: newService.is_active
        })
        .eq('id', editingService.id);

      if (error) {
        console.error('Error updating service:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في تحديث الخدمة",
          variant: "destructive",
        });
        return;
      }

      await fetchServices();
      setNewService({
        name: "",
        description: "",
        category: "",
        base_price: "",
        is_active: true
      });
      setIsEditDialogOpen(false);
      setEditingService(null);
      
      toast({
        title: "تم تحديث الخدمة",
        description: "تم تحديث بيانات الخدمة بنجاح",
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDeleteService = async (serviceId) => {
    try {
      const { error } = await supabase
        .from('service_types')
        .delete()
        .eq('id', serviceId);

      if (error) {
        console.error('Error deleting service:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في حذف الخدمة",
          variant: "destructive",
        });
        return;
      }

      await fetchServices();
      
      toast({
        title: "تم حذف الخدمة",
        description: "تم حذف الخدمة بنجاح",
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleToggleActive = async (service) => {
    try {
      const { error } = await supabase
        .from('service_types')
        .update({ is_active: !service.is_active })
        .eq('id', service.id);

      if (error) {
        console.error('Error toggling service status:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في تغيير حالة الخدمة",
          variant: "destructive",
        });
        return;
      }

      await fetchServices();
      
      toast({
        title: "تم تحديث الحالة",
        description: `تم ${!service.is_active ? 'تفعيل' : 'إلغاء تفعيل'} الخدمة`,
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري تحميل الخدمات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* العنوان والإحصائيات */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-7 w-7 text-primary" />
            إدارة أنواع الخدمات
          </h1>
          <p className="text-muted-foreground mt-1">
            إدارة وتنظيم جميع أنواع الخدمات المقدمة
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث عن خدمة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة خدمة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>إضافة خدمة جديدة</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">اسم الخدمة</Label>
                  <Input 
                    id="name" 
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    placeholder="أدخل اسم الخدمة" 
                  />
                </div>
                <div>
                  <Label htmlFor="category">فئة الخدمة</Label>
                  <Input 
                    id="category" 
                    value={newService.category}
                    onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                    placeholder="مثل: تطوير المواقع، التسويق الرقمي" 
                  />
                </div>
                <div>
                  <Label htmlFor="base_price">السعر الأساسي (اختياري)</Label>
                   <Input 
                     id="base_price" 
                     type="text"
                     value={newService.base_price}
                     onChange={(e) => setNewService({ ...newService, base_price: e.target.value })}
                     placeholder="0.00" 
                   />
                </div>
                <div>
                  <Label htmlFor="description">وصف الخدمة</Label>
                  <Textarea 
                    id="description" 
                    value={newService.description}
                    onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                    placeholder="وصف تفصيلي للخدمة..." 
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={newService.is_active}
                    onCheckedChange={(checked) => setNewService({ ...newService, is_active: checked })}
                  />
                  <Label htmlFor="is_active">الخدمة نشطة</Label>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="hero" 
                    className="flex-1"
                    onClick={handleAddService}
                  >
                    حفظ الخدمة
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Service Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>تعديل بيانات الخدمة</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">اسم الخدمة</Label>
                  <Input 
                    id="edit-name" 
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    placeholder="أدخل اسم الخدمة" 
                  />
                </div>
                <div>
                  <Label htmlFor="edit-category">فئة الخدمة</Label>
                  <Input 
                    id="edit-category" 
                    value={newService.category}
                    onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                    placeholder="مثل: تطوير المواقع، التسويق الرقمي" 
                  />
                </div>
                <div>
                  <Label htmlFor="edit-base_price">السعر الأساسي (اختياري)</Label>
                   <Input 
                     id="edit-base_price" 
                     type="text"
                     value={newService.base_price}
                     onChange={(e) => setNewService({ ...newService, base_price: e.target.value })}
                     placeholder="0.00" 
                   />
                </div>
                <div>
                  <Label htmlFor="edit-description">وصف الخدمة</Label>
                  <Textarea 
                    id="edit-description" 
                    value={newService.description}
                    onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                    placeholder="وصف تفصيلي للخدمة..." 
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-is_active"
                    checked={newService.is_active}
                    onCheckedChange={(checked) => setNewService({ ...newService, is_active: checked })}
                  />
                  <Label htmlFor="edit-is_active">الخدمة نشطة</Label>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="hero" 
                    className="flex-1"
                    onClick={handleUpdateService}
                  >
                    تحديث الخدمة
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الخدمات</p>
                <p className="text-xl font-bold">{services.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-success/10 p-2 rounded-lg">
                <Eye className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الخدمات النشطة</p>
                <p className="text-xl font-bold">{services.filter(s => s.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-muted/50 p-2 rounded-lg">
                <EyeOff className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الخدمات المعطلة</p>
                <p className="text-xl font-bold">{services.filter(s => !s.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* جدول الخدمات */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الخدمات</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الخدمة</TableHead>
                <TableHead>الفئة</TableHead>
                <TableHead>السعر الأساسي</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{service.category}</Badge>
                  </TableCell>
                  <TableCell>
                    {service.base_price ? `${service.base_price} ر.س` : 'غير محدد'}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      {service.description ? 
                        (service.description.length > 50 ? 
                          service.description.substring(0, 50) + '...' : 
                          service.description
                        ) : 
                        'لا يوجد وصف'
                      }
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={service.is_active ? "default" : "secondary"}
                      className={service.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}
                    >
                      {service.is_active ? 'نشط' : 'معطل'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleToggleActive(service)}
                        title={service.is_active ? 'إلغاء التفعيل' : 'تفعيل'}
                      >
                        {service.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEditService(service)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteService(service.id)}
                        className="text-destructive hover:text-destructive"
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

export default ServiceTypes;