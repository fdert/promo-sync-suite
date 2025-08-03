import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Printer, Package, Download, Eye } from "lucide-react";
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
} from "@/components/ui/dialog";

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
    customer_id: string;
    customers: {
      name: string;
    };
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
  const { user } = useAuth();
  const [printOrders, setPrintOrders] = useState<PrintOrder[]>([]);
  const [printFiles, setPrintFiles] = useState<PrintFile[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PrintOrder | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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
  }, []);

  const fetchPrintOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("print_orders")
        .select(`
          *,
          orders!inner(
            order_number,
            service_name,
            customer_id,
            customers!inner(
              name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPrintOrders(data || []);
    } catch (error) {
      console.error("Error fetching print orders:", error);
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

  const handleViewDetails = async (order: PrintOrder) => {
    setSelectedOrder(order);
    await fetchPrintFiles(order.id);
    setIsDetailsOpen(true);
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
    }
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

      {/* إحصائيات سريعة */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{printOrders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد الطباعة</CardTitle>
            <Printer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {printOrders.filter(order => order.status === 'printing').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مكتملة</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {printOrders.filter(order => order.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {printOrders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">لا توجد طلبات طباعة</h3>
            <p className="text-muted-foreground">
              سيتم عرض طلبات الطباعة هنا عند إنشائها
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>جميع طلبات الطباعة</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم طلب الطباعة</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>الطلب الأصلي</TableHead>
                  <TableHead>الخدمة</TableHead>
                  <TableHead>الكمية</TableHead>
                  <TableHead>التكلفة المتوقعة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تاريخ الإنشاء</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {printOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.print_order_number}
                    </TableCell>
                    <TableCell>{order.orders.customers.name}</TableCell>
                    <TableCell>{order.orders.order_number}</TableCell>
                    <TableCell>{order.orders.service_name}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>{order.estimated_cost} ر.س</TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={`${statusColors[order.status as keyof typeof statusColors]} text-white text-xs`}
                      >
                        {statusLabels[order.status as keyof typeof statusLabels]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(order.created_at).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(order)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        عرض التفاصيل
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog لعرض تفاصيل الطلب */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              تفاصيل طلب الطباعة {selectedOrder?.print_order_number}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* معلومات الطلب */}
              <Card>
                <CardHeader>
                  <CardTitle>معلومات الطلب</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">العميل: </span>
                      <span className="font-medium">{selectedOrder.orders.customers.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الطلب الأصلي: </span>
                      <span className="font-medium">{selectedOrder.orders.order_number}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الخدمة: </span>
                      <span className="font-medium">{selectedOrder.orders.service_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الكمية: </span>
                      <span className="font-medium">{selectedOrder.quantity}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">التكلفة المتوقعة: </span>
                      <span className="font-medium">{selectedOrder.estimated_cost} ر.س</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الحالة: </span>
                      <Badge 
                        variant="secondary" 
                        className={`${statusColors[selectedOrder.status as keyof typeof statusColors]} text-white text-xs`}
                      >
                        {statusLabels[selectedOrder.status as keyof typeof statusLabels]}
                      </Badge>
                    </div>
                  </div>
                  {selectedOrder.design_notes && (
                    <div className="mt-4">
                      <span className="text-muted-foreground">ملاحظات التصميم: </span>
                      <p className="text-sm mt-1">{selectedOrder.design_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* الملفات المرسلة */}
              <Card>
                <CardHeader>
                  <CardTitle>الملفات المرسلة ({printFiles.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {printFiles.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">لا توجد ملفات مرسلة</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {printFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-6 w-6 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{file.file_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(file.upload_date).toLocaleDateString('ar-SA')} • 
                                {(file.file_size / 1024 / 1024).toFixed(2)} MB
                              </p>
                              {file.notes && (
                                <p className="text-xs text-muted-foreground mt-1">{file.notes}</p>
                              )}
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
                            className="gap-2"
                          >
                            <Download className="h-4 w-4" />
                            تحميل
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrintOrders;