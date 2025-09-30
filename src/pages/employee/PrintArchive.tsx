// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  FileText, 
  Download, 
  Calendar,
  User,
  Phone,
  Archive,
  Printer,
  Eye,
  ArrowLeft,
  Palette
} from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsapp_number: string;
  printOrdersCount: number;
  printFilesCount: number;
  lastOrderDate: string;
}

interface PrintOrder {
  id: string;
  print_order_number: string;
  status: string;
  order_id: string;
  quantity: number;
  estimated_cost: number;
  actual_cost: number;
  created_at: string;
  orders: {
    order_number: string;
    service_name: string;
  };
}

interface PrintFile {
  id: string;
  print_order_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  file_category: string;
  is_approved: boolean;
  upload_date: string;
  notes?: string;
}

const PrintArchive = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerPrintOrders, setCustomerPrintOrders] = useState<PrintOrder[]>([]);
  const [customerPrintFiles, setCustomerPrintFiles] = useState<PrintFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
    fetchCustomersWithPrintData();
  }, []);

  const fetchCustomersWithPrintData = async () => {
    try {
      setLoading(true);
      
      // جلب العملاء مع إحصائيات طلبات الطباعة
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          name,
          phone,
          whatsapp_number,
          created_at
        `)
        .order('name');

      if (error) throw error;

      // جلب إحصائيات طلبات الطباعة لكل عميل
      const customersWithStats = await Promise.all(
        (data || []).map(async (customer) => {
          // جلب طلبات الطباعة للعميل
          const { data: printOrdersData } = await supabase
            .from('print_orders')
            .select(`
              id,
              created_at,
              orders!inner(customer_id)
            `)
            .eq('orders.customer_id', customer.id);

          const printOrderIds = printOrdersData?.map(po => po.id) || [];

          // عدد الملفات
          let filesCount = 0;
          if (printOrderIds.length > 0) {
            const { count } = await supabase
              .from('print_files')
              .select('*', { count: 'exact', head: true })
              .in('print_order_id', printOrderIds);
            filesCount = count || 0;
          }

          // آخر تاريخ طلب
          const lastOrderDate = printOrdersData && printOrdersData.length > 0
            ? printOrdersData[0].created_at
            : customer.created_at;

          return {
            ...customer,
            printOrdersCount: printOrdersData?.length || 0,
            printFilesCount: filesCount,
            lastOrderDate: lastOrderDate
          };
        })
      );

      setCustomers(customersWithStats.filter(c => c.printOrdersCount > 0));
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في جلب بيانات العملاء",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerPrintData = async (customerId: string) => {
    try {
      // جلب طلبات الطباعة للعميل
      const { data: printOrders, error: ordersError } = await supabase
        .from('print_orders')
        .select(`
          *,
          orders!inner(
            order_number,
            service_name,
            customer_id
          )
        `)
        .eq('orders.customer_id', customerId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      setCustomerPrintOrders(printOrders || []);

      // جلب جميع الملفات لطلبات الطباعة
      if (printOrders && printOrders.length > 0) {
        const printOrderIds = printOrders.map(po => po.id);
        
        const { data: printFiles, error: filesError } = await supabase
          .from('print_files')
          .select('*')
          .in('print_order_id', printOrderIds)
          .order('upload_date', { ascending: false });

        if (filesError) throw filesError;
        setCustomerPrintFiles(printFiles || []);
      } else {
        setCustomerPrintFiles([]);
      }
    } catch (error) {
      console.error('Error fetching customer print data:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في جلب بيانات الطباعة",
        variant: "destructive",
      });
    }
  };

  const handleCustomerClick = async (customer: Customer) => {
    setSelectedCustomer(customer);
    await fetchCustomerPrintData(customer.id);
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
      toast({
        title: "خطأ في التحميل",
        description: "فشل في تحميل الملف",
        variant: "destructive",
      });
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesName = customer.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPhone = customer.phone?.includes(searchTerm) || customer.whatsapp_number?.includes(searchTerm);
    const matchesDate = searchDate ? new Date(customer.lastOrderDate).toISOString().split('T')[0] >= searchDate : true;
    
    return (matchesName || matchesPhone) && matchesDate;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل الأرشيف...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Archive className="h-8 w-8 text-primary" />
            أرشيف طلبات الطباعة
          </h1>
          <p className="text-muted-foreground mt-1">
            أرشيف شامل لجميع طلبات وملفات الطباعة للعملاء
          </p>
        </div>
      </div>

      {/* فلاتر البحث */}
      <Card>
        <CardHeader>
          <CardTitle>البحث والفلترة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث باسم العميل أو رقم الجوال..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  placeholder="من تاريخ"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setSearchDate("");
                }}
                className="w-full"
              >
                مسح الفلاتر
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* إحصائيات سريعة */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي العملاء</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي طلبات الطباعة</CardTitle>
            <Printer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.reduce((sum, customer) => sum + customer.printOrdersCount, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الملفات</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.reduce((sum, customer) => sum + customer.printFilesCount, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">النتائج المعروضة</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredCustomers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* جدول العملاء */}
      <Card>
        <CardHeader>
          <CardTitle>عملاء طلبات الطباعة</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-8">
              <Archive className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">لا توجد نتائج</h3>
              <p className="text-muted-foreground">
                لا توجد عملاء يطابقون معايير البحث
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العميل</TableHead>
                  <TableHead>رقم الجوال</TableHead>
                  <TableHead>طلبات الطباعة</TableHead>
                  <TableHead>الملفات</TableHead>
                  <TableHead>آخر طلب</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{customer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {customer.phone && (
                          <div className="text-sm flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </div>
                        )}
                        {customer.whatsapp_number && (
                          <div className="text-sm text-green-600">
                            WhatsApp: {customer.whatsapp_number}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {customer.printOrdersCount} طلب
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {customer.printFilesCount} ملف
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(customer.lastOrderDate).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCustomerClick(customer)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        عرض الأرشيف
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog لعرض تفاصيل العميل */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDetailsOpen(false)}
                className="p-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              أرشيف طلبات الطباعة - {selectedCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-6">
              {/* معلومات العميل */}
              <Card>
                <CardHeader>
                  <CardTitle>معلومات العميل</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-muted-foreground">الاسم: </span>
                      <span className="font-medium">{selectedCustomer.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الجوال: </span>
                      <span className="font-medium">{selectedCustomer.phone || 'غير محدد'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">واتساب: </span>
                      <span className="font-medium">{selectedCustomer.whatsapp_number || 'غير محدد'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">إجمالي الطلبات: </span>
                      <Badge variant="outline">{selectedCustomer.printOrdersCount}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* طلبات الطباعة */}
              <Card>
                <CardHeader>
                  <CardTitle>طلبات الطباعة ({customerPrintOrders.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {customerPrintOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <Printer className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">لا توجد طلبات طباعة</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {customerPrintOrders.map((order) => {
                        const orderFiles = customerPrintFiles.filter(file => file.print_order_id === order.id);
                        
                        return (
                          <div key={order.id} className="border rounded-lg p-4">
                            {/* معلومات طلب الطباعة */}
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
                              <div>
                                <span className="text-sm text-muted-foreground">رقم الطلب</span>
                                <p className="font-medium">{order.print_order_number}</p>
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">الخدمة</span>
                                <p className="font-medium">{order.orders.service_name}</p>
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">الكمية</span>
                                <p className="font-medium">{order.quantity}</p>
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">التكلفة</span>
                                <div>
                                  <div className="text-sm">متوقعة: {order.estimated_cost} ر.س</div>
                                  {order.actual_cost > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                      فعلية: {order.actual_cost} ر.س
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">الحالة</span>
                                <div className="mt-1">
                                  <Badge 
                                    variant="secondary" 
                                    className={`${statusColors[order.status as keyof typeof statusColors]} text-white text-xs`}
                                  >
                                    {statusLabels[order.status as keyof typeof statusLabels]}
                                  </Badge>
                                </div>
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">التاريخ</span>
                                <p className="font-medium text-sm">
                                  {new Date(order.created_at).toLocaleDateString('ar-SA')}
                                </p>
                              </div>
                            </div>
                            
                            {/* ملفات الطباعة لهذا الطلب */}
                            <div className="border-t pt-4">
                              <h4 className="font-medium mb-3 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                ملفات الطلب ({orderFiles.length})
                              </h4>
                              {orderFiles.length === 0 ? (
                                <p className="text-sm text-muted-foreground">لا توجد ملفات مرفوعة لهذا الطلب</p>
                              ) : (
                                <Tabs defaultValue="design" className="w-full">
                                  <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="design" className="flex items-center gap-2">
                                      <Palette className="h-4 w-4" />
                                      ملفات البروفة ({orderFiles.filter(f => f.file_category === 'design').length})
                                    </TabsTrigger>
                                    <TabsTrigger value="print" className="flex items-center gap-2">
                                      <Printer className="h-4 w-4" />
                                      ملفات الطباعة ({orderFiles.filter(f => f.file_category === 'print').length})
                                    </TabsTrigger>
                                  </TabsList>
                                  
                                  <TabsContent value="design" className="mt-4">
                                    {orderFiles.filter(f => f.file_category === 'design').length === 0 ? (
                                      <div className="text-center py-8 bg-blue-50 rounded-lg">
                                        <Palette className="mx-auto h-8 w-8 text-blue-400 mb-2" />
                                        <p className="text-sm text-muted-foreground">لا توجد ملفات بروفة لهذا الطلب</p>
                                      </div>
                                    ) : (
                                      <div className="grid gap-3">
                                        {orderFiles.filter(f => f.file_category === 'design').map((file) => (
                                          <div key={file.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                                            <div className="flex items-center gap-3">
                                              <Palette className="h-5 w-5 text-blue-600" />
                                              <div>
                                                <p className="font-medium text-sm">{file.file_name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                  {new Date(file.upload_date).toLocaleDateString('ar-SA')} • 
                                                  {(file.file_size / 1024 / 1024).toFixed(2)} MB • 
                                                  {file.file_type}
                                                </p>
                                                {file.notes && (
                                                  <p className="text-xs text-muted-foreground mt-1">{file.notes}</p>
                                                )}
                                              </div>
                                              {file.is_approved && (
                                                <Badge variant="secondary" className="bg-green-500 text-white text-xs">
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
                                              <Download className="h-3 w-3" />
                                              تحميل
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </TabsContent>
                                  
                                  <TabsContent value="print" className="mt-4">
                                    {orderFiles.filter(f => f.file_category === 'print').length === 0 ? (
                                      <div className="text-center py-8 bg-green-50 rounded-lg">
                                        <Printer className="mx-auto h-8 w-8 text-green-400 mb-2" />
                                        <p className="text-sm text-muted-foreground">لا توجد ملفات طباعة لهذا الطلب</p>
                                      </div>
                                    ) : (
                                      <div className="grid gap-3">
                                        {orderFiles.filter(f => f.file_category === 'print').map((file) => (
                                          <div key={file.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                            <div className="flex items-center gap-3">
                                              <Printer className="h-5 w-5 text-green-600" />
                                              <div>
                                                <p className="font-medium text-sm">{file.file_name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                  {new Date(file.upload_date).toLocaleDateString('ar-SA')} • 
                                                  {(file.file_size / 1024 / 1024).toFixed(2)} MB • 
                                                  {file.file_type}
                                                </p>
                                                {file.notes && (
                                                  <p className="text-xs text-muted-foreground mt-1">{file.notes}</p>
                                                )}
                                              </div>
                                              {file.is_approved && (
                                                <Badge variant="secondary" className="bg-green-500 text-white text-xs">
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
                                              <Download className="h-3 w-3" />
                                              تحميل
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </TabsContent>
                                </Tabs>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ملفات البروفة */}
              <Card>
                <CardHeader>
                  <CardTitle>ملفات البروفة ({customerPrintFiles.filter(f => f.file_category === 'design').length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {customerPrintFiles.filter(f => f.file_category === 'design').length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">لا توجد ملفات بروفة مرفوعة</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {customerPrintFiles
                        .filter(f => f.file_category === 'design')
                        .map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
                            <div className="flex items-center gap-3">
                              <FileText className="h-6 w-6 text-blue-600" />
                              <div>
                                <p className="font-medium">{file.file_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(file.upload_date).toLocaleDateString('ar-SA')} • 
                                  {(file.file_size / 1024 / 1024).toFixed(2)} MB • 
                                  {file.file_type}
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

              {/* ملفات الطباعة */}
              <Card>
                <CardHeader>
                  <CardTitle>ملفات الطباعة ({customerPrintFiles.filter(f => f.file_category === 'print').length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {customerPrintFiles.filter(f => f.file_category === 'print').length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">لا توجد ملفات طباعة مرفوعة</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {customerPrintFiles
                        .filter(f => f.file_category === 'print')
                        .map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                            <div className="flex items-center gap-3">
                              <Printer className="h-6 w-6 text-green-600" />
                              <div>
                                <p className="font-medium">{file.file_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(file.upload_date).toLocaleDateString('ar-SA')} • 
                                  {(file.file_size / 1024 / 1024).toFixed(2)} MB • 
                                  {file.file_type}
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

export default PrintArchive;