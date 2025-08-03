import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Printer, Package } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

const PrintOrders = () => {
  const { user } = useAuth();
  const [printOrders, setPrintOrders] = useState<PrintOrder[]>([]);
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PrintOrders;