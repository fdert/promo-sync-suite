// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Eye, Download, Search, Printer, FileText, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp_number?: string;
  total_orders: number;
  total_spent: number;
}

interface PrintOrder {
  id: string;
  print_order_number: string;
  status: string;
  quantity: number;
  estimated_cost: number;
  actual_cost: number;
  created_at: string;
  design_started_at?: string;
  design_completed_at?: string;
  print_started_at?: string;
  print_completed_at?: string;
  orders: {
    order_number: string;
    service_name: string;
    description?: string;
    amount: number;
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

const CustomerPrintOrders = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerPrintOrders, setCustomerPrintOrders] = useState<PrintOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
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
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name");

      if (error) throw error;

      // حساب عدد طلبات الطباعة لكل عميل
      const customersWithPrintCount = await Promise.all(
        (data || []).map(async (customer) => {
          const { data: printOrdersCount } = await supabase
            .from("print_orders")
            .select("id", { count: "exact" })
            .eq("orders.customer_id", customer.id);

          return {
            ...customer,
            print_orders_count: printOrdersCount?.length || 0
          };
        })
      );

      setCustomers(customersWithPrintCount);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل قائمة العملاء",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerPrintOrders = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from("print_orders")
        .select(`
          *,
          orders!inner(
            order_number,
            service_name,
            description,
            amount,
            customer_id
          ),
          print_materials(
            material_name,
            material_type
          ),
          print_files!left(
            id,
            file_name,
            file_path,
            file_type,
            upload_date,
            is_approved
          )
        `)
        .eq("orders.customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomerPrintOrders(data || []);
    } catch (error) {
      console.error("Error fetching customer print orders:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل طلبات الطباعة للعميل",
        variant: "destructive",
      });
    }
  };

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

  const calculateProgress = (status: string) => {
    const statusOrder = ["pending", "in_design", "design_completed", "ready_for_print", "printing", "printed", "quality_check", "completed"];
    const currentIndex = statusOrder.indexOf(status);
    return currentIndex >= 0 ? Math.round(((currentIndex + 1) / statusOrder.length) * 100) : 0;
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (customer.phone && customer.phone.includes(searchTerm))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">طلبات الطباعة للعملاء</h1>
          <p className="text-muted-foreground">
            عرض وإدارة طلبات الطباعة لكل عميل
          </p>
        </div>
      </div>

      {/* البحث */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="البحث عن عميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* قائمة العملاء */}
      <div className="grid gap-4">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{customer.name}</h3>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                    {customer.email && (
                      <span>البريد: {customer.email}</span>
                    )}
                    {customer.phone && (
                      <span>الهاتف: {customer.phone}</span>
                    )}
                    {customer.whatsapp_number && (
                      <span>واتساب: {customer.whatsapp_number}</span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-2">
                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      إجمالي الطلبات: {customer.total_orders}
                    </span>
                    <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                      إجمالي المبيعات: {customer.total_spent.toLocaleString()} ر.س
                    </span>
                  </div>
                </div>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        setSelectedCustomer(customer);
                        fetchCustomerPrintOrders(customer.id);
                      }}
                    >
                      <Eye className="ml-2 h-4 w-4" />
                      عرض طلبات الطباعة
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        طلبات الطباعة - {selectedCustomer?.name}
                      </DialogTitle>
                    </DialogHeader>
                    
                    <Tabs defaultValue="orders" className="space-y-4">
                      <TabsList>
                        <TabsTrigger value="orders">طلبات الطباعة</TabsTrigger>
                        <TabsTrigger value="files">ملفات التصاميم</TabsTrigger>
                      </TabsList>

                      <TabsContent value="orders" className="space-y-4">
                        {customerPrintOrders.length === 0 ? (
                          <div className="text-center py-12">
                            <Printer className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">لا توجد طلبات طباعة</h3>
                            <p className="text-muted-foreground">
                              لم يتم إنشاء أي طلبات طباعة لهذا العميل بعد
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {customerPrintOrders.map((order) => (
                              <Card key={order.id}>
                                <CardContent className="p-6">
                                  <div className="flex items-start justify-between mb-4">
                                    <div>
                                      <h4 className="font-semibold text-lg">{order.print_order_number}</h4>
                                      <p className="text-sm text-muted-foreground">
                                        طلب أصلي: {order.orders.order_number}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        الخدمة: {order.orders.service_name}
                                      </p>
                                    </div>
                                    <Badge className={`${statusColors[order.status as keyof typeof statusColors]} text-white`}>
                                      {statusLabels[order.status as keyof typeof statusLabels]}
                                    </Badge>
                                  </div>

                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div>
                                      <p className="text-sm text-muted-foreground">الكمية</p>
                                      <p className="font-medium">{order.quantity}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">التكلفة المقدرة</p>
                                      <p className="font-medium">{order.estimated_cost} ر.س</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">التكلفة الفعلية</p>
                                      <p className="font-medium">{order.actual_cost || 0} ر.س</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">المادة</p>
                                      <p className="font-medium">
                                        {order.print_materials?.material_name || "غير محدد"}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium">تقدم العمل</span>
                                      <span className="text-sm text-muted-foreground">
                                        {calculateProgress(order.status)}%
                                      </span>
                                    </div>
                                    <Progress value={calculateProgress(order.status)} className="h-2" />
                                  </div>

                                  {order.print_files && order.print_files.length > 0 && (
                                    <div className="mt-4">
                                      <h5 className="font-medium mb-2">الملفات المرفقة:</h5>
                                      <div className="flex flex-wrap gap-2">
                                        {order.print_files.map((file) => (
                                          <Button
                                            key={file.id}
                                            size="sm"
                                            variant="outline"
                                            onClick={() => downloadFile(file.file_path, file.file_name)}
                                          >
                                            <Download className="ml-2 h-3 w-3" />
                                            {file.file_name}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="mt-4 text-sm text-muted-foreground">
                                    <p>تاريخ الإنشاء: {new Date(order.created_at).toLocaleDateString('ar-SA')}</p>
                                    {order.design_started_at && (
                                      <p>بدء التصميم: {new Date(order.design_started_at).toLocaleDateString('ar-SA')}</p>
                                    )}
                                    {order.design_completed_at && (
                                      <p>اكتمال التصميم: {new Date(order.design_completed_at).toLocaleDateString('ar-SA')}</p>
                                    )}
                                    {order.print_completed_at && (
                                      <p>اكتمال الطباعة: {new Date(order.print_completed_at).toLocaleDateString('ar-SA')}</p>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="files" className="space-y-4">
                        {(() => {
                          const allFiles = customerPrintOrders.flatMap(order => 
                            (order.print_files || []).map(file => ({
                              ...file,
                              order_number: order.print_order_number,
                              order_service: order.orders.service_name
                            }))
                          );

                          if (allFiles.length === 0) {
                            return (
                              <div className="text-center py-12">
                                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium mb-2">لا توجد ملفات تصاميم</h3>
                                <p className="text-muted-foreground">
                                  لم يتم رفع أي ملفات تصاميم لهذا العميل بعد
                                </p>
                              </div>
                            );
                          }

                          return (
                            <div className="grid gap-4">
                              {allFiles.map((file) => (
                                <Card key={file.id}>
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h5 className="font-medium">{file.file_name}</h5>
                                        <p className="text-sm text-muted-foreground">
                                          طلب: {file.order_number} - {file.order_service}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          تاريخ الرفع: {new Date(file.upload_date).toLocaleDateString('ar-SA')}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant={file.is_approved ? "default" : "secondary"}>
                                          {file.is_approved ? "مُعتمد" : "في الانتظار"}
                                        </Badge>
                                        <Button
                                          size="sm"
                                          onClick={() => downloadFile(file.file_path, file.file_name)}
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          );
                        })()}
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">لا توجد عملاء</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "لا توجد نتائج للبحث المحدد" : "لم يتم إضافة أي عملاء بعد"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerPrintOrders;