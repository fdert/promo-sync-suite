import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardList,
  Search,
  Eye,
  Upload,
  FileText,
  Send,
  Download,
  CheckCircle,
  XCircle,
  Image,
  Printer,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";

interface Order {
  id: string;
  order_number: string;
  service_name: string;
  description: string;
  status: string;
  priority: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  created_at: string;
  customers?: {
    name: string;
    whatsapp_number: string;
    phone: string;
  };
}

interface PrintFile {
  id: string;
  file_name: string;
  file_path: string;
  file_category: string;
  file_size: number;
  upload_date: string;
  sent_to_customer: boolean;
  sent_at: string | null;
  is_approved: boolean;
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // حالات رفع الملفات
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedOrderForUpload, setSelectedOrderForUpload] = useState<Order | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileCategory, setFileCategory] = useState<"design" | "print">("design");
  
  // حالات عرض الملفات
  const [isFilesDialogOpen, setIsFilesDialogOpen] = useState(false);
  const [selectedOrderFiles, setSelectedOrderFiles] = useState<Order | null>(null);
  const [orderFiles, setOrderFiles] = useState<PrintFile[]>([]);
  
  const { toast } = useToast();

  // جلب الطلبات
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers (name, whatsapp_number, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب الطلبات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // جلب ملفات طلب معين
  const fetchOrderFiles = async (orderId: string) => {
    try {
      // البحث عن print_order مرتبط بالطلب
      const { data: printOrder, error: printOrderError } = await supabase
        .from('print_orders')
        .select('id')
        .eq('order_id', orderId)
        .single();

      if (printOrderError || !printOrder) {
        setOrderFiles([]);
        return;
      }

      // جلب الملفات
      const { data: files, error: filesError } = await supabase
        .from('print_files')
        .select('*')
        .eq('print_order_id', printOrder.id)
        .order('upload_date', { ascending: false });

      if (filesError) throw filesError;
      setOrderFiles(files || []);
    } catch (error) {
      console.error('Error fetching order files:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب ملفات الطلب",
        variant: "destructive",
      });
    }
  };

  // رفع الملفات
  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0 || !selectedOrderForUpload) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار ملفات للرفع",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    try {
      // البحث عن print_order أو إنشاؤه
      let printOrderId;
      const { data: existingPrintOrder } = await supabase
        .from('print_orders')
        .select('id')
        .eq('order_id', selectedOrderForUpload.id)
        .single();

      if (existingPrintOrder) {
        printOrderId = existingPrintOrder.id;
      } else {
        // إنشاء print_order جديد
        const { data: newPrintOrder, error: createError } = await supabase
          .from('print_orders')
          .insert({
            order_id: selectedOrderForUpload.id,
            status: 'pending',
            quantity: 1
          })
          .select('id')
          .single();

        if (createError) throw createError;
        printOrderId = newPrintOrder.id;
      }

      // رفع الملفات
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${printOrderId}_${Date.now()}_${i}.${fileExt}`;
        const filePath = `${printOrderId}/${fileName}`;

        // رفع الملف إلى storage
        const { error: uploadError } = await supabase.storage
          .from('print-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // حفظ معلومات الملف في قاعدة البيانات
        const { error: insertError } = await supabase
          .from('print_files')
          .insert({
            print_order_id: printOrderId,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
            mime_type: file.type,
            file_category: fileCategory,
            sent_to_customer: false
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "تم رفع الملفات",
        description: `تم رفع ${files.length} ملف بنجاح`,
      });

      setIsUploadDialogOpen(false);
      setSelectedOrderForUpload(null);

    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "خطأ في رفع الملفات",
        description: "حدث خطأ أثناء رفع الملفات",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // إرسال بروفة التصميم للعميل
  const sendDesignProofToCustomer = async (fileId: string, orderId: string) => {
    try {
      // إرسال رسالة واتساب للعميل
      const order = orders.find(o => o.id === orderId);
      if (!order) throw new Error('الطلب غير موجود');

      // إرسال الإشعار
      const { error: notificationError } = await supabase
        .from('whatsapp_messages')
        .insert({
          from_number: 'system',
          to_number: order.customers?.whatsapp_number || '',
          message_type: 'text',
          message_content: `مرحبا ${order.customers?.name}،

يسعدنا إبلاغكم بأن بروفة التصميم للطلب ${order.order_number} جاهزة للمراجعة.

تفاصيل الطلب:
📦 الخدمة: ${order.service_name}
📝 الوصف: ${order.description}
💰 المبلغ: ${order.amount} ر.س

يرجى مراجعة البروفة والموافقة عليها أو إرسال أي تعديلات مطلوبة.

شكراً لكم،
وكالة الإبداع للدعاية والإعلان

التاريخ: ${new Date().toLocaleDateString('ar-SA')}`,
          status: 'pending',
          customer_id: order.customers ? (order as any).customer_id : null
        });

      if (notificationError) throw notificationError;

      // تحديث حالة الملف
      const { error: updateError } = await supabase
        .from('print_files')
        .update({
          sent_to_customer: true,
          sent_at: new Date().toISOString()
        })
        .eq('id', fileId);

      if (updateError) throw updateError;

      toast({
        title: "تم إرسال البروفة",
        description: "تم إرسال بروفة التصميم للعميل عبر الواتساب",
      });

      // تحديث قائمة الملفات
      if (selectedOrderFiles) {
        fetchOrderFiles(selectedOrderFiles.id);
      }

    } catch (error) {
      console.error('Error sending design proof:', error);
      toast({
        title: "خطأ في الإرسال",
        description: "فشل في إرسال البروفة للعميل",
        variant: "destructive",
      });
    }
  };

  // تحميل ملف
  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('print-files')
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
      console.error('Error downloading file:', error);
      toast({
        title: "خطأ في التحميل",
        description: "فشل في تحميل الملف",
        variant: "destructive",
      });
    }
  };

  // فلترة الطلبات
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customers?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // تنسيق تاريخ الملف
  const formatFileDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA');
  };

  // تنسيق حجم الملف
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-8">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* العنوان والبحث */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8" />
            إدارة الطلبات
          </h1>
          <p className="text-muted-foreground mt-1">
            عرض وإدارة جميع الطلبات مع إمكانية رفع الملفات
          </p>
        </div>
      </div>

      {/* فلاتر البحث */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث برقم الطلب أو الخدمة أو اسم العميل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="حالة الطلب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="جديد">جديد</SelectItem>
                <SelectItem value="مؤكد">مؤكد</SelectItem>
                <SelectItem value="قيد التنفيذ">قيد التنفيذ</SelectItem>
                <SelectItem value="قيد المراجعة">قيد المراجعة</SelectItem>
                <SelectItem value="جاهز للتسليم">جاهز للتسليم</SelectItem>
                <SelectItem value="مكتمل">مكتمل</SelectItem>
                <SelectItem value="ملغي">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* جدول الطلبات */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الطلبات ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>الخدمة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الأولوية</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>تاريخ الاستحقاق</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.order_number}
                    </TableCell>
                    <TableCell>{order.customers?.name}</TableCell>
                    <TableCell>{order.service_name}</TableCell>
                    <TableCell>
                      <Badge variant={
                        order.status === 'مكتمل' ? 'default' :
                        order.status === 'ملغي' ? 'destructive' :
                        order.status === 'قيد التنفيذ' ? 'secondary' : 'outline'
                      }>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        order.priority === 'عالية' ? 'destructive' :
                        order.priority === 'متوسطة' ? 'secondary' : 'outline'
                      }>
                        {order.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.amount.toLocaleString()} ر.س</TableCell>
                    <TableCell>
                      {order.due_date ? new Date(order.due_date).toLocaleDateString('ar-SA') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {/* رفع ملفات التصميم */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrderForUpload(order);
                            setFileCategory('design');
                            setIsUploadDialogOpen(true);
                          }}
                        >
                          <Image className="h-4 w-4 mr-1" />
                          بروفة
                        </Button>
                        
                        {/* رفع ملفات الطباعة */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrderForUpload(order);
                            setFileCategory('print');
                            setIsUploadDialogOpen(true);
                          }}
                        >
                          <Printer className="h-4 w-4 mr-1" />
                          طباعة
                        </Button>
                        
                        {/* عرض الملفات */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrderFiles(order);
                            setIsFilesDialogOpen(true);
                            fetchOrderFiles(order.id);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          الملفات
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* حوار رفع الملفات */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              رفع {fileCategory === 'design' ? 'ملفات بروفة التصميم' : 'ملفات الطباعة'}
            </DialogTitle>
            <DialogDescription>
              اختر الملفات المراد رفعها للطلب المحدد
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedOrderForUpload && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>الطلب:</strong> {selectedOrderForUpload.order_number}</p>
                <p className="text-sm"><strong>العميل:</strong> {selectedOrderForUpload.customers?.name}</p>
                <p className="text-sm"><strong>الخدمة:</strong> {selectedOrderForUpload.service_name}</p>
              </div>
            )}
            
            <div>
              <Label htmlFor="file-upload">اختر الملفات</Label>
              <Input
                id="file-upload"
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.ai,.psd"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFileUpload(e.target.files);
                  }
                }}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                يمكنك رفع ملفات الصور، PDF، Word، AI، PSD
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* حوار عرض الملفات */}
      <Dialog open={isFilesDialogOpen} onOpenChange={setIsFilesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              ملفات الطلب {selectedOrderFiles?.order_number}
            </DialogTitle>
            <DialogDescription>
              عرض وإدارة جميع الملفات المرفوعة للطلب
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedOrderFiles && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>العميل:</strong> {selectedOrderFiles.customers?.name}</p>
                <p className="text-sm"><strong>الخدمة:</strong> {selectedOrderFiles.service_name}</p>
              </div>
            )}
            
            {orderFiles.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لا توجد ملفات مرفوعة لهذا الطلب
              </p>
            ) : (
              <div className="space-y-3">
                {orderFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">{file.file_name}</span>
                        <Badge variant={file.file_category === 'design' ? 'secondary' : 'outline'}>
                          {file.file_category === 'design' ? 'بروفة' : 'طباعة'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)} • {formatFileDate(file.upload_date)}
                      </p>
                      {file.sent_to_customer && (
                        <p className="text-xs text-green-600">
                          تم الإرسال للعميل في {formatFileDate(file.sent_at!)}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* إرسال للعميل (للبروفة فقط) */}
                      {file.file_category === 'design' && !file.sent_to_customer && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendDesignProofToCustomer(file.id, selectedOrderFiles!.id)}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          إرسال للعميل
                        </Button>
                      )}
                      
                      {/* تحميل الملف */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadFile(file.file_path, file.file_name)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        تحميل
                      </Button>
                      
                      {/* حالة الإرسال */}
                      {file.file_category === 'design' && (
                        file.sent_to_customer ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-400" />
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;