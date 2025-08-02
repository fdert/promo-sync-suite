import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Eye, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";

interface PrintOrder {
  id: string;
  print_order_number: string;
  status: string;
  order_id: string;
  dimensions_width?: number;
  dimensions_height?: number;
  quantity: number;
  design_notes?: string;
  estimated_cost: number;
  created_at: string;
  orders: {
    order_number: string;
    service_name: string;
  };
}

interface PrintFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  is_approved: boolean;
  upload_date: string;
  notes?: string;
}

const PrintOrders = () => {
  const [printOrders, setPrintOrders] = useState<PrintOrder[]>([]);
  const [printFiles, setPrintFiles] = useState<PrintFile[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PrintOrder | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
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
    if (user) {
      fetchUserPrintOrders();
    }
  }, [user]);

  useEffect(() => {
    if (selectedOrder) {
      fetchPrintFiles(selectedOrder.id);
    }
  }, [selectedOrder]);

  const fetchUserPrintOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("print_orders")
        .select(`
          *,
          orders!inner(
            order_number,
            service_name
          )
        `)
        .eq("created_by", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPrintOrders(data || []);
      
      if (data && data.length > 0) {
        setSelectedOrder(data[0]);
      }
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

  const fetchPrintFiles = async (printOrderId: string) => {
    try {
      const { data, error } = await supabase
        .from("print_files")
        .select("*")
        .eq("print_order_id", printOrderId)
        .order("upload_date", { ascending: false });

      if (error) throw error;
      setPrintFiles(data || []);
    } catch (error) {
      console.error("Error fetching print files:", error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !selectedOrder || !user) return;

    const file = event.target.files[0];
    if (!file) return;

    setUploadingFile(true);

    try {
      // رفع الملف إلى التخزين
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${selectedOrder.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("print-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // حفظ معلومات الملف في قاعدة البيانات
      const { error: dbError } = await supabase
        .from("print_files")
        .insert({
          print_order_id: selectedOrder.id,
          file_name: file.name,
          file_path: filePath,
          file_type: "design",
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id
        });

      if (dbError) throw dbError;

      await fetchPrintFiles(selectedOrder.id);
      
      toast({
        title: "تم الرفع بنجاح",
        description: "تم رفع الملف بنجاح",
      });

      // إعادة تعيين قيمة input
      event.target.value = '';
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "خطأ في الرفع",
        description: "فشل في رفع الملف",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("print-files")
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "خطأ في التحميل",
        description: "فشل في تحميل الملف",
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
        <h1 className="text-3xl font-bold">طلبات الطباعة والتنفيذ</h1>
      </div>

      {printOrders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">لا توجد طلبات طباعة</h3>
            <p className="text-muted-foreground">
              سيتم إنشاء طلبات الطباعة تلقائياً عند اكتمال طلباتك
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* قائمة الطلبات */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-semibold">طلباتي</h2>
            {printOrders.map((order) => (
              <Card 
                key={order.id} 
                className={`cursor-pointer transition-all ${
                  selectedOrder?.id === order.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedOrder(order)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{order.print_order_number}</h3>
                    <Badge 
                      variant="secondary" 
                      className={`${statusColors[order.status as keyof typeof statusColors]} text-white text-xs`}
                    >
                      {statusLabels[order.status as keyof typeof statusLabels]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{order.orders.service_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString('ar-SA')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* تفاصيل الطلب المختار */}
          <div className="lg:col-span-2 space-y-4">
            {selectedOrder && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      تفاصيل الطلب {selectedOrder.print_order_number}
                      <Badge 
                        variant="secondary" 
                        className={`${statusColors[selectedOrder.status as keyof typeof statusColors]} text-white`}
                      >
                        {statusLabels[selectedOrder.status as keyof typeof statusLabels]}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">الطلب الأصلي</Label>
                        <p>{selectedOrder.orders.order_number}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">الخدمة</Label>
                        <p>{selectedOrder.orders.service_name}</p>
                      </div>
                      {selectedOrder.dimensions_width && selectedOrder.dimensions_height && (
                        <div>
                          <Label className="text-muted-foreground">المقاسات</Label>
                          <p>{selectedOrder.dimensions_width} × {selectedOrder.dimensions_height}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-muted-foreground">الكمية</Label>
                        <p>{selectedOrder.quantity}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">التكلفة المتوقعة</Label>
                        <p>{selectedOrder.estimated_cost} ر.س</p>
                      </div>
                    </div>

                    {selectedOrder.design_notes && (
                      <div>
                        <Label className="text-muted-foreground">ملاحظات التصميم</Label>
                        <p className="text-sm mt-1">{selectedOrder.design_notes}</p>
                      </div>
                    )}

                    {/* شريط التقدم */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>تقدم الطلب</span>
                        <span>{Math.round(calculateProgress(selectedOrder.status))}%</span>
                      </div>
                      <Progress value={calculateProgress(selectedOrder.status)} className="w-full" />
                    </div>
                  </CardContent>
                </Card>

                {/* رفع الملفات */}
                <Card>
                  <CardHeader>
                    <CardTitle>ملفات التصميم</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* منطقة رفع الملفات */}
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-4" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">رفع ملفات التصميم</p>
                        <p className="text-xs text-muted-foreground">
                          يمكنك رفع ملفات التصميم بصيغ مختلفة (PDF, AI, PSD, PNG, JPG)
                        </p>
                        <div className="pt-2">
                          <Label htmlFor="file-upload" className="cursor-pointer">
                            <Button disabled={uploadingFile} asChild>
                              <span>
                                {uploadingFile ? "جاري الرفع..." : "اختر ملف"}
                              </span>
                            </Button>
                          </Label>
                          <Input
                            id="file-upload"
                            type="file"
                            className="hidden"
                            accept=".pdf,.ai,.psd,.png,.jpg,.jpeg,.eps,.svg"
                            onChange={handleFileUpload}
                            disabled={uploadingFile}
                          />
                        </div>
                      </div>
                    </div>

                    {/* قائمة الملفات المرفوعة */}
                    {printFiles.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">الملفات المرفوعة</h4>
                        {printFiles.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">{file.file_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(file.upload_date).toLocaleDateString('ar-SA')} • 
                                  {(file.file_size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              {file.is_approved && (
                                <Badge variant="secondary" className="bg-green-500 text-white">
                                  معتمد
                                </Badge>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadFile(file.file_path, file.file_name)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintOrders;