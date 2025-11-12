// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Printer, Upload, FileText, Clock, CheckCircle, XCircle, Plus, Edit, Trash2, Save, X, Download, Eye, TrendingUp, BarChart3, PieChart as PieChartIcon, DollarSign, Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface PrintOrder {
  id: string;
  print_order_number: string;
  status: string;
  order_id: string;
  material_id?: string;
  dimensions_width?: number;
  dimensions_height?: number;
  dimensions_depth?: number;
  quantity: number;
  print_type?: string;
  finishing_type?: string;
  design_notes?: string;
  printing_notes?: string;
  estimated_cost: number;
  actual_cost: number;
  design_started_at?: string;
  design_completed_at?: string;
  print_started_at?: string;
  print_completed_at?: string;
  created_at: string;
  orders: {
    order_number: string;
    customers: {
      name: string;
    };
    service_types?: {
      name: string;
    };
  };
  print_materials?: {
    material_name: string;
    material_type: string;
  };
  print_files?: Array<{
    id: string;
    file_name: string;
    file_path: string;
    file_type: string;
    upload_date: string;
    is_approved: boolean;
  }>;
}

interface PrintFile {
  id: string;
  print_order_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size?: number;
  mime_type?: string;
  upload_date: string;
  uploaded_by?: string;
  is_approved: boolean;
  approval_date?: string;
  approved_by?: string;
  notes?: string;
}

interface PrintMaterial {
  id: string;
  material_name: string;
  material_type: string;
  cost_per_unit: number;
  unit_type: string;
  color?: string;
  thickness?: string;
  is_active?: boolean;
}

interface MaterialFormData {
  material_name: string;
  material_type: string;
  cost_per_unit: number;
  unit_type: string;
  color: string;
  thickness: string;
}

const PrintManagement = () => {
  const [printOrders, setPrintOrders] = useState<PrintOrder[]>([]);
  const [printMaterials, setPrintMaterials] = useState<PrintMaterial[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PrintOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [downloadingFiles, setDownloadingFiles] = useState<string[]>([]);
  const [editingMaterial, setEditingMaterial] = useState<PrintMaterial | null>(null);
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [orderMaterialForm, setOrderMaterialForm] = useState({
    material_id: "",
    dimensions_width: 0,
    dimensions_height: 0,
    dimensions_depth: 0,
    actual_cost: 0,
    printing_notes: ""
  });
  const [materialForm, setMaterialForm] = useState<MaterialFormData>({
    material_name: "",
    material_type: "",
    cost_per_unit: 0,
    unit_type: "متر مربع",
    color: "",
    thickness: ""
  });
  const { toast } = useToast();

  const statusLabels = {
    pending: "في الانتظار",
    in_design: "قيد التصميم",
    design_completed: "التصميم مكتمل",
    ready_for_print: "جاهز للطباعة",
    printing: "قيد الطباعة",
    printed: "تم الطباعة",
    quality_check: "فحص الجودة",
    completed: "مكتمل",
    cancelled: "ملغي"
  };

  const statusColors = {
    pending: "bg-yellow-500",
    in_design: "bg-blue-500",
    design_completed: "bg-green-500",
    ready_for_print: "bg-purple-500",
    printing: "bg-orange-500",
    printed: "bg-cyan-500",
    quality_check: "bg-indigo-500",
    completed: "bg-green-600",
    cancelled: "bg-red-500"
  };

  useEffect(() => {
    fetchPrintOrders();
    fetchPrintMaterials();
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (roles) {
          setUserRole(roles.role);
        }
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchPrintOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("print_orders")
        .select(`
          *,
          orders!inner(
            order_number,
            customers!inner(name),
            service_types(name)
          ),
          print_materials(
            material_name,
            material_type
          ),
          print_files(
            id,
            file_name,
            file_path,
            file_type,
            upload_date,
            is_approved
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPrintOrders(data || []);
    } catch (error) {
      console.error("Error fetching print orders:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل طلبات الطباعة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPrintMaterials = async () => {
    try {
      setMaterialsLoading(true);
      const { data, error } = await supabase
        .from("print_materials")
        .select("*")
        .eq("is_active", true)
        .order("material_name");

      if (error) throw error;
      setPrintMaterials(data || []);
    } catch (error) {
      console.error("Error fetching print materials:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل مواد الطباعة",
        variant: "destructive",
      });
    } finally {
      setMaterialsLoading(false);
    }
  };

  const handleAddMaterial = async () => {
    try {
      if (!materialForm.material_name || !materialForm.material_type) {
        toast({
          title: "خطأ",
          description: "يرجى ملء جميع الحقول المطلوبة",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("print_materials")
        .insert([{
          ...materialForm,
          is_active: true
        }]);

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: "تم إضافة المادة الجديدة",
      });

      setMaterialForm({
        material_name: "",
        material_type: "",
        cost_per_unit: 0,
        unit_type: "متر مربع",
        color: "",
        thickness: ""
      });
      setIsAddingMaterial(false);
      await fetchPrintMaterials();
    } catch (error) {
      console.error("Error adding material:", error);
      toast({
        title: "خطأ",
        description: "فشل في إضافة المادة",
        variant: "destructive",
      });
    }
  };

  const handleEditMaterial = async () => {
    try {
      if (!editingMaterial || !materialForm.material_name || !materialForm.material_type) {
        toast({
          title: "خطأ",
          description: "يرجى ملء جميع الحقول المطلوبة",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("print_materials")
        .update(materialForm)
        .eq("id", editingMaterial.id);

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: "تم تحديث المادة",
      });

      setEditingMaterial(null);
      setMaterialForm({
        material_name: "",
        material_type: "",
        cost_per_unit: 0,
        unit_type: "متر مربع",
        color: "",
        thickness: ""
      });
      await fetchPrintMaterials();
    } catch (error) {
      console.error("Error updating material:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث المادة",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    try {
      const { error } = await supabase
        .from("print_materials")
        .update({ is_active: false })
        .eq("id", materialId);

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: "تم حذف المادة",
      });

      await fetchPrintMaterials();
    } catch (error) {
      console.error("Error deleting material:", error);
      toast({
        title: "خطأ",
        description: "فشل في حذف المادة",
        variant: "destructive",
      });
    }
  };

  const startEditMaterial = (material: PrintMaterial) => {
    setEditingMaterial(material);
    setMaterialForm({
      material_name: material.material_name,
      material_type: material.material_type,
      cost_per_unit: material.cost_per_unit,
      unit_type: material.unit_type,
      color: material.color || "",
      thickness: material.thickness || ""
    });
  };

  // وظائف رفع الملفات وإدارة المواد
  const handleFileUpload = async (orderId: string, files: FileList) => {
    if (!files.length) return;

    setUploading(true);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error("المستخدم غير مسجل الدخول");
      }

      for (const file of Array.from(files)) {
        // رفع الملف إلى storage
        const fileExtension = file.name.split('.').pop();
        const fileName = `${orderId}_${Date.now()}.${fileExtension}`;
        const filePath = `${orderId}/${fileName}`;

        // رفع مع معالجة خطأ "Bucket not found" عبر محاولة بديلة
        let uploadResult: any = await supabase.storage
          .from('print_files')
          .upload(filePath, file);
        let uploadError = uploadResult?.error || null;
        if (uploadError && (uploadError as any).message?.includes('Bucket not found')) {
          const retry = await supabase.storage.from('print_files').upload(filePath, file);
          uploadError = retry?.error || null;
        }

        if (uploadError) throw uploadError;

        // حفظ معلومات الملف في قاعدة البيانات
        const { error: dbError } = await supabase
          .from('print_files')
          .insert({
            print_order_id: orderId,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type || 'unknown',
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user.data.user.id,
            is_approved: false
          });

        if (dbError) throw dbError;
      }

      toast({
        title: "تم بنجاح",
        description: "تم رفع الملفات بنجاح",
      });

      await fetchPrintOrders();
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        title: "خطأ",
        description: "فشل في رفع الملفات",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateOrderMaterials = async (orderId: string) => {
    try {
      if (!orderMaterialForm.material_id) {
        toast({
          title: "خطأ",
          description: "يرجى اختيار المادة المستخدمة",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("print_orders")
        .update({
          material_id: orderMaterialForm.material_id,
          dimensions_width: orderMaterialForm.dimensions_width || null,
          dimensions_height: orderMaterialForm.dimensions_height || null,
          dimensions_depth: orderMaterialForm.dimensions_depth || null,
          actual_cost: orderMaterialForm.actual_cost || 0,
          printing_notes: orderMaterialForm.printing_notes || null
        })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: "تم تحديث معلومات المواد والتكلفة",
      });

      setSelectedOrder(null);
      setOrderMaterialForm({
        material_id: "",
        dimensions_width: 0,
        dimensions_height: 0,
        dimensions_depth: 0,
        actual_cost: 0,
        printing_notes: ""
      });
      await fetchPrintOrders();
    } catch (error) {
      console.error("Error updating order materials:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث معلومات المواد",
        variant: "destructive",
      });
    }
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('print_files')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل الملف",
        variant: "destructive",
      });
    }
  };

  const downloadAllFiles = async (orderId: string, printOrderNumber: string) => {
    try {
      setDownloadingFiles(prev => [...prev, orderId]);

      // جلب جميع ملفات هذا الطلب
      const { data: files, error } = await supabase
        .from('print_files')
        .select('file_path, file_name')
        .eq('print_order_id', orderId);

      if (error) throw error;

      if (!files || files.length === 0) {
        toast({
          title: "لا توجد ملفات",
          description: "لا توجد ملفات للتحميل في هذا الطلب",
          variant: "destructive",
        });
        return;
      }

      // تحميل الملفات واحد تلو الآخر
      for (const file of files) {
        await downloadFile(file.file_path, file.file_name);
        // إضافة تأخير بسيط بين التحميلات
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast({
        title: "تم التحميل",
        description: `تم تحميل ${files.length} ملف من طلب ${printOrderNumber}`,
      });

    } catch (error) {
      console.error("Error downloading all files:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل الملفات",
        variant: "destructive",
      });
    } finally {
      setDownloadingFiles(prev => prev.filter(id => id !== orderId));
    }
  };

  const openOrderDialog = (order: PrintOrder) => {
    setSelectedOrder(order);
    setOrderMaterialForm({
      material_id: order.material_id || "",
      dimensions_width: order.dimensions_width || 0,
      dimensions_height: order.dimensions_height || 0,
      dimensions_depth: order.dimensions_depth || 0,
      actual_cost: order.actual_cost || 0,
      printing_notes: order.printing_notes || ""
    });
  };

  const cancelEdit = () => {
    setEditingMaterial(null);
    setIsAddingMaterial(false);
    setMaterialForm({
      material_name: "",
      material_type: "",
      cost_per_unit: 0,
      unit_type: "متر مربع",
      color: "",
      thickness: ""
    });
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      // إضافة الطوابع الزمنية المناسبة
      if (newStatus === "in_design" && !selectedOrder?.design_started_at) {
        updateData.design_started_at = new Date().toISOString();
      } else if (newStatus === "design_completed") {
        updateData.design_completed_at = new Date().toISOString();
      } else if (newStatus === "printing") {
        updateData.print_started_at = new Date().toISOString();
      } else if (newStatus === "printed") {
        updateData.print_completed_at = new Date().toISOString();
      } else if (newStatus === "quality_check") {
        updateData.quality_check_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("print_orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;

      // تسجيل التتبع
      await supabase.from("print_tracking").insert({
        print_order_id: orderId,
        stage: newStatus,
        status: "completed",
        notes: `تحديث الحالة إلى: ${statusLabels[newStatus as keyof typeof statusLabels]}`,
        performed_by: (await supabase.auth.getUser()).data.user?.id
      });

      await fetchPrintOrders();
      
      toast({
        title: "تم التحديث",
        description: `تم تحديث حالة الطلب إلى: ${statusLabels[newStatus as keyof typeof statusLabels]}`,
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث حالة الطلب",
        variant: "destructive",
      });
    }
  };

  const calculateProgress = (status: string) => {
    const statusOrder = ["pending", "in_design", "design_completed", "ready_for_print", "printing", "printed", "quality_check", "completed"];
    const currentIndex = statusOrder.indexOf(status);
    return ((currentIndex + 1) / statusOrder.length) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل طلبات الطباعة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">إدارة الطباعة والتنفيذ</h1>
        <div className="flex gap-2">
          <Button onClick={fetchPrintOrders}>
            <Clock className="ml-2 h-4 w-4" />
            تحديث
          </Button>
        </div>
      </div>

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">طلبات الطباعة</TabsTrigger>
          <TabsTrigger value="materials">المواد</TabsTrigger>
          {(userRole === "admin" || userRole === "manager") && (
            <TabsTrigger value="reports">التقارير</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          {/* إحصائيات سريعة */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="flex items-center p-6">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">إجمالي الطلبات</p>
                  <p className="text-2xl font-bold">{printOrders.length}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center p-6">
                <Clock className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">قيد التنفيذ</p>
                  <p className="text-2xl font-bold">
                    {printOrders.filter(order => 
                      ["in_design", "ready_for_print", "printing"].includes(order.status)
                    ).length}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center p-6">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">مكتملة</p>
                  <p className="text-2xl font-bold">
                    {printOrders.filter(order => order.status === "completed").length}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center p-6">
                <Printer className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">قيد الطباعة</p>
                  <p className="text-2xl font-bold">
                    {printOrders.filter(order => order.status === "printing").length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* قائمة طلبات الطباعة */}
          <div className="grid gap-4">
            {printOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="secondary" 
                        className={`${statusColors[order.status as keyof typeof statusColors]} text-white`}
                      >
                        {statusLabels[order.status as keyof typeof statusLabels]}
                      </Badge>
                      <h3 className="font-semibold">{order.print_order_number}</h3>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('ar-SA')}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground">الطلب الأصلي</p>
                      <p>{order.orders.order_number}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">الخدمة</p>
                      <p>{order.orders.service_types?.name || "غير محدد"}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">العميل</p>
                      <p>{order.orders.customers.name}</p>
                    </div>
                    {order.dimensions_width && order.dimensions_height && (
                      <div>
                        <p className="font-medium text-muted-foreground">المقاسات</p>
                        <p>{order.dimensions_width} × {order.dimensions_height} {order.dimensions_depth && `× ${order.dimensions_depth}`}</p>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-muted-foreground">الكمية</p>
                      <p>{order.quantity}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">التكلفة المتوقعة</p>
                      <p>{order.estimated_cost} ر.س</p>
                    </div>
                  </div>

                  {/* شريط التقدم */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>تقدم الطلب</span>
                      <span>{Math.round(calculateProgress(order.status))}%</span>
                    </div>
                    <Progress value={calculateProgress(order.status)} className="w-full" />
                  </div>

                  {/* أزرار التحكم */}
                  <div className="flex gap-2 flex-wrap">
                    {/* أزرار حالة الطلب */}
                    {order.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, "in_design")}
                      >
                        بدء التصميم
                      </Button>
                    )}
                    {order.status === "in_design" && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, "design_completed")}
                      >
                        إكمال التصميم
                      </Button>
                    )}
                    {order.status === "design_completed" && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, "ready_for_print")}
                      >
                        جاهز للطباعة
                      </Button>
                    )}
                    {order.status === "ready_for_print" && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, "printing")}
                      >
                        بدء الطباعة
                      </Button>
                    )}
                    {order.status === "printing" && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, "printed")}
                      >
                        انتهاء الطباعة
                      </Button>
                    )}
                    {order.status === "printed" && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, "quality_check")}
                      >
                        فحص الجودة
                      </Button>
                    )}
                    {order.status === "quality_check" && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, "completed")}
                      >
                        إكمال الطلب
                      </Button>
                    )}
                    
                    {/* أزرار إضافية لإدارة الملفات والمواد */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openOrderDialog(order)}
                        >
                          <Upload className="ml-2 h-4 w-4" />
                          رفع التصميم
                        </Button>
                      </DialogTrigger>

                    {/* زر تحميل جميع ملفات الطباعة */}
                    {order.print_files && order.print_files.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadAllFiles(order.id, order.print_order_number)}
                        disabled={downloadingFiles.includes(order.id)}
                      >
                        {downloadingFiles.includes(order.id) ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                        ) : (
                          <Download className="ml-2 h-4 w-4" />
                        )}
                        تحميل الملفات ({order.print_files.length})
                      </Button>
                    )}
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>إدارة الملفات والمواد - {order.print_order_number}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6">
                          {/* قسم رفع الملفات */}
                          <div>
                            <h4 className="font-medium mb-3">رفع التصاميم النهائية</h4>
                            <Input
                              type="file"
                              multiple
                              accept=".pdf,.jpg,.jpeg,.png,.ai,.psd,.eps"
                              onChange={(e) => e.target.files && handleFileUpload(order.id, e.target.files)}
                              disabled={uploading}
                            />
                            {uploading && (
                              <p className="text-sm text-muted-foreground mt-2">جاري رفع الملفات...</p>
                            )}
                          </div>

                          {/* قسم اختيار المواد والمقاسات */}
                          <div className="space-y-4">
                            <h4 className="font-medium">تفاصيل التنفيذ النهائي</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label>المادة المستخدمة</Label>
                                <Select 
                                  value={orderMaterialForm.material_id} 
                                  onValueChange={(value) => setOrderMaterialForm({...orderMaterialForm, material_id: value})}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="اختر المادة" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {printMaterials.map((material) => (
                                      <SelectItem key={material.id} value={material.id}>
                                        {material.material_name} - {material.material_type}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <Label>التكلفة الفعلية</Label>
                                 <Input
                                   type="text"
                                   value={orderMaterialForm.actual_cost}
                                   onChange={(e) => setOrderMaterialForm({...orderMaterialForm, actual_cost: parseFloat(e.target.value) || 0})}
                                   placeholder="0.00"
                                 />
                              </div>
                              
                              <div>
                                <Label>العرض (سم)</Label>
                                 <Input
                                   type="text"
                                   value={orderMaterialForm.dimensions_width}
                                   onChange={(e) => setOrderMaterialForm({...orderMaterialForm, dimensions_width: parseFloat(e.target.value) || 0})}
                                   placeholder="100"
                                 />
                              </div>
                              
                              <div>
                                <Label>الارتفاع (سم)</Label>
                                 <Input
                                   type="text"
                                   value={orderMaterialForm.dimensions_height}
                                   onChange={(e) => setOrderMaterialForm({...orderMaterialForm, dimensions_height: parseFloat(e.target.value) || 0})}
                                   placeholder="150"
                                 />
                              </div>
                              
                              <div>
                                <Label>العمق (سم) - اختياري</Label>
                                 <Input
                                   type="text"
                                   value={orderMaterialForm.dimensions_depth}
                                   onChange={(e) => setOrderMaterialForm({...orderMaterialForm, dimensions_depth: parseFloat(e.target.value) || 0})}
                                   placeholder="5"
                                 />
                              </div>
                            </div>
                            
                            <div>
                              <Label>ملاحظات الطباعة</Label>
                              <Textarea
                                value={orderMaterialForm.printing_notes}
                                onChange={(e) => setOrderMaterialForm({...orderMaterialForm, printing_notes: e.target.value})}
                                placeholder="ملاحظات حول الطباعة أو التشطيب..."
                                rows={3}
                              />
                            </div>
                            
                            <Button 
                              onClick={() => handleUpdateOrderMaterials(order.id)}
                              className="w-full"
                            >
                              <Save className="ml-2 h-4 w-4" />
                              حفظ تفاصيل التنفيذ
                            </Button>
                          </div>

                          {/* عرض الملفات المرفوعة */}
                          {order.print_files && order.print_files.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-3">الملفات المرفوعة</h4>
                              <div className="space-y-2">
                                {order.print_files.map((file) => (
                                  <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                      <FileText className="h-4 w-4" />
                                      <div>
                                        <p className="text-sm font-medium">{file.file_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {new Date(file.upload_date).toLocaleDateString('ar-SA')}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => downloadFile(file.file_path, file.file_name)}
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                      {file.is_approved && (
                                        <Badge variant="default" className="bg-green-500">
                                          معتمد
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {printOrders.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Printer className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">لا توجد طلبات طباعة</h3>
                <p className="text-muted-foreground">
                  سيتم إنشاء طلبات الطباعة تلقائياً عند اكتمال الطلبات
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="materials">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>مواد الطباعة</CardTitle>
              <Button 
                onClick={() => setIsAddingMaterial(true)}
                className="ml-auto"
              >
                <Plus className="ml-2 h-4 w-4" />
                إضافة مادة جديدة
              </Button>
            </CardHeader>
            <CardContent>
              {/* نموذج إضافة/تعديل مادة */}
              {(isAddingMaterial || editingMaterial) && (
                <Card className="mb-6 border-dashed">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {editingMaterial ? "تعديل المادة" : "إضافة مادة جديدة"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="material_name">اسم المادة *</Label>
                        <Input
                          id="material_name"
                          value={materialForm.material_name}
                          onChange={(e) => setMaterialForm({...materialForm, material_name: e.target.value})}
                          placeholder="مثال: فوم بورد"
                        />
                      </div>
                      <div>
                        <Label htmlFor="material_type">نوع المادة *</Label>
                        <Select 
                          value={materialForm.material_type} 
                          onValueChange={(value) => setMaterialForm({...materialForm, material_type: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر نوع المادة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="بلاستيك">بلاستيك</SelectItem>
                            <SelectItem value="ورق">ورق</SelectItem>
                            <SelectItem value="فينيل">فينيل</SelectItem>
                            <SelectItem value="أكريليك">أكريليك</SelectItem>
                            <SelectItem value="فوم">فوم</SelectItem>
                            <SelectItem value="معدن">معدن</SelectItem>
                            <SelectItem value="نسيج">نسيج</SelectItem>
                            <SelectItem value="خشب">خشب</SelectItem>
                            <SelectItem value="زجاج">زجاج</SelectItem>
                            <SelectItem value="أخرى">أخرى</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="cost_per_unit">التكلفة لكل وحدة</Label>
                         <Input
                           id="cost_per_unit"
                           type="text"
                           value={materialForm.cost_per_unit}
                           onChange={(e) => setMaterialForm({...materialForm, cost_per_unit: parseFloat(e.target.value) || 0})}
                           placeholder="0.00"
                         />
                      </div>
                      <div>
                        <Label htmlFor="unit_type">وحدة القياس</Label>
                        <Select 
                          value={materialForm.unit_type} 
                          onValueChange={(value) => setMaterialForm({...materialForm, unit_type: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر وحدة القياس" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="متر مربع">متر مربع</SelectItem>
                            <SelectItem value="متر طولي">متر طولي</SelectItem>
                            <SelectItem value="قطعة">قطعة</SelectItem>
                            <SelectItem value="ورقة">ورقة</SelectItem>
                            <SelectItem value="كيلوجرام">كيلوجرام</SelectItem>
                            <SelectItem value="لتر">لتر</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="color">اللون</Label>
                        <Input
                          id="color"
                          value={materialForm.color}
                          onChange={(e) => setMaterialForm({...materialForm, color: e.target.value})}
                          placeholder="مثال: أبيض، أسود، شفاف"
                        />
                      </div>
                      <div>
                        <Label htmlFor="thickness">السماكة</Label>
                        <Input
                          id="thickness"
                          value={materialForm.thickness}
                          onChange={(e) => setMaterialForm({...materialForm, thickness: e.target.value})}
                          placeholder="مثال: 3مم، 5مم"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button 
                        onClick={editingMaterial ? handleEditMaterial : handleAddMaterial}
                        disabled={materialsLoading}
                      >
                        <Save className="ml-2 h-4 w-4" />
                        {editingMaterial ? "حفظ التعديل" : "إضافة المادة"}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={cancelEdit}
                      >
                        <X className="ml-2 h-4 w-4" />
                        إلغاء
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* قائمة المواد */}
              {materialsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">جاري تحميل المواد...</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {printMaterials.map((material) => (
                    <div key={material.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex-1">
                        <h3 className="font-medium text-lg">{material.material_name}</h3>
                        <div className="mt-1 text-sm text-muted-foreground">
                          <span className="inline-block">النوع: {material.material_type}</span>
                          {material.color && (
                            <span className="inline-block mx-2">• اللون: {material.color}</span>
                          )}
                          {material.thickness && (
                            <span className="inline-block">• السماكة: {material.thickness}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <p className="font-medium text-lg">{material.cost_per_unit} ر.س</p>
                          <p className="text-sm text-muted-foreground">{material.unit_type}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditMaterial(material)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من حذف المادة "{material.material_name}"؟ 
                                  لن يمكن التراجع عن هذا الإجراء.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteMaterial(material.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {printMaterials.length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">لا توجد مواد طباعة</h3>
                      <p className="text-muted-foreground mb-4">
                        ابدأ بإضافة المواد المستخدمة في عمليات الطباعة
                      </p>
                      <Button onClick={() => setIsAddingMaterial(true)}>
                        <Plus className="ml-2 h-4 w-4" />
                        إضافة مادة جديدة
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <div className="space-y-6">
            {/* إحصائيات عامة */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="flex items-center p-6">
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">متوسط وقت التصميم</p>
                    <p className="text-2xl font-bold">
                      {(() => {
                        const designTimes = printOrders
                          .filter(order => order.design_started_at && order.design_completed_at)
                          .map(order => {
                            const start = new Date(order.design_started_at!);
                            const end = new Date(order.design_completed_at!);
                            return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                          });
                        const avg = designTimes.length > 0 
                          ? Math.round(designTimes.reduce((a, b) => a + b, 0) / designTimes.length) 
                          : 0;
                        return `${avg} يوم`;
                      })()}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="flex items-center p-6">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">إجمالي التكلفة الفعلية</p>
                    <p className="text-2xl font-bold">
                      {printOrders.reduce((sum, order) => sum + (order.actual_cost || 0), 0).toLocaleString()} ر.س
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="flex items-center p-6">
                  <Package className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">أكثر المواد استخداماً</p>
                    <p className="text-2xl font-bold">
                      {(() => {
                        const materialUsage = printOrders.reduce((acc, order) => {
                          if (order.print_materials?.material_name) {
                            acc[order.print_materials.material_name] = (acc[order.print_materials.material_name] || 0) + 1;
                          }
                          return acc;
                        }, {} as Record<string, number>);
                        const mostUsed = Object.entries(materialUsage).sort((a, b) => b[1] - a[1])[0];
                        return mostUsed ? mostUsed[0] : "لا يوجد";
                      })()}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="flex items-center p-6">
                  <Clock className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">متوسط وقت الطباعة</p>
                    <p className="text-2xl font-bold">
                      {(() => {
                        const printTimes = printOrders
                          .filter(order => order.print_started_at && order.print_completed_at)
                          .map(order => {
                            const start = new Date(order.print_started_at!);
                            const end = new Date(order.print_completed_at!);
                            return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                          });
                        const avg = printTimes.length > 0 
                          ? Math.round(printTimes.reduce((a, b) => a + b, 0) / printTimes.length) 
                          : 0;
                        return `${avg} يوم`;
                      })()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* رسم بياني لحالات الطلبات */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  توزيع حالات طلبات الطباعة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    count: {
                      label: "عدد الطلبات",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.entries(statusLabels).map(([status, label]) => ({
                        status: label,
                        count: printOrders.filter(order => order.status === status).length,
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="status" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar 
                        dataKey="count" 
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* الرسم الدائري لاستخدام المواد */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    استخدام المواد
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const materialUsage = printOrders.reduce((acc, order) => {
                      if (order.print_materials?.material_name) {
                        const materialName = order.print_materials.material_name;
                        acc[materialName] = (acc[materialName] || 0) + 1;
                      }
                      return acc;
                    }, {} as Record<string, number>);

                    const data = Object.entries(materialUsage).map(([name, count], index) => ({
                      name,
                      value: count,
                      fill: `hsl(${(index * 360) / Object.keys(materialUsage).length}, 70%, 50%)`
                    }));

                    if (data.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">لا توجد بيانات لعرضها</p>
                        </div>
                      );
                    }

                    return (
                      <ChartContainer
                        config={{
                          value: {
                            label: "عدد الاستخدامات",
                          },
                        }}
                        className="h-[300px]"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                            >
                              {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* قائمة أحدث الطلبات المكتملة */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    آخر الطلبات المكتملة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {printOrders
                      .filter(order => order.status === "completed")
                      .slice(0, 5)
                      .map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{order.print_order_number}</p>
                            <p className="text-sm text-muted-foreground">{order.orders.customers.name}</p>
                          </div>
                          <div className="text-left">
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString('ar-SA')}
                            </p>
                            <Badge variant="default" className="bg-green-500">
                              مكتمل
                            </Badge>
                          </div>
                        </div>
                      ))}
                    {printOrders.filter(order => order.status === "completed").length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">لا توجد طلبات مكتملة بعد</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* تقرير مفصل للأداء */}
            <Card>
              <CardHeader>
                <CardTitle>تقرير الأداء الشهري</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <h4 className="font-medium">الطلبات المنجزة هذا الشهر</h4>
                    <p className="text-2xl font-bold text-green-600">
                      {printOrders.filter(order => {
                        const orderDate = new Date(order.created_at);
                        const now = new Date();
                        return orderDate.getMonth() === now.getMonth() && 
                               orderDate.getFullYear() === now.getFullYear() &&
                               order.status === "completed";
                      }).length}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">متوسط وقت الإنجاز</h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {(() => {
                        const completedOrders = printOrders.filter(order => 
                          order.status === "completed" && order.created_at && order.print_completed_at
                        );
                        if (completedOrders.length === 0) return "0 يوم";
                        
                        const totalDays = completedOrders.reduce((sum, order) => {
                          const start = new Date(order.created_at);
                          const end = new Date(order.print_completed_at!);
                          return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                        }, 0);
                        
                        return `${Math.round(totalDays / completedOrders.length)} يوم`;
                      })()}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">معدل الكفاءة</h4>
                    <p className="text-2xl font-bold text-purple-600">
                      {printOrders.length > 0 
                        ? Math.round((printOrders.filter(order => order.status === "completed").length / printOrders.length) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PrintManagement;