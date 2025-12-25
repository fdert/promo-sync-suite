import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, Package, AlertTriangle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { addArabicFont } from "@/lib/arabic-pdf-font";

interface OrderWithDetails {
  id: string;
  order_number: string;
  created_at: string;
  total_amount: number;
  status: string;
  customer_name: string;
  items: Array<{
    item_name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  consumables: Array<{
    material_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    notes: string;
  }>;
  obstacles: Array<{
    obstacle_type: string;
    description: string;
    created_at: string;
    customer_notified: boolean;
  }>;
}

const OrderDetailedReport = () => {
  const [startDate, setStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const { toast } = useToast();

  const fetchOrdersWithDetails = async () => {
    try {
      setLoading(true);

      // جلب الطلبات مع العملاء والبنود
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          created_at,
          total_amount,
          status,
          customers(name)
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const ordersWithDetails: OrderWithDetails[] = [];

      for (const order of ordersData || []) {
        // جلب بنود الطلب
        const { data: itemsData } = await supabase
          .from('order_items')
          .select('item_name, quantity, unit_price, total')
          .eq('order_id', order.id);

        // جلب المستهلكات
        const { data: consumablesData } = await supabase
          .from('order_consumables')
          .select('material_name, quantity, unit_price, total, notes')
          .eq('order_id', order.id);

        // جلب المعوقات
        const { data: obstaclesData } = await supabase
          .from('order_obstacles')
          .select('obstacle_type, description, created_at, customer_notified')
          .eq('order_id', order.id);

        ordersWithDetails.push({
          id: order.id,
          order_number: order.order_number || '-',
          created_at: order.created_at,
          total_amount: order.total_amount || 0,
          status: order.status || 'غير محدد',
          customer_name: order.customers?.name || 'غير محدد',
          items: itemsData || [],
          consumables: consumablesData || [],
          obstacles: obstaclesData || []
        });
      }

      setOrders(ordersWithDetails);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في جلب بيانات الطلبات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersWithDetails();
  }, [startDate, endDate]);

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const filteredOrders = orders.filter(order => 
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      'pending': { label: 'قيد الانتظار', variant: 'secondary' },
      'in_progress': { label: 'قيد التنفيذ', variant: 'default' },
      'مكتمل': { label: 'مكتمل', variant: 'outline' },
      'completed': { label: 'مكتمل', variant: 'outline' },
      'cancelled': { label: 'ملغي', variant: 'destructive' },
    };
    const statusInfo = statusMap[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getObstacleTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      'customer_delay': 'تأخر العميل',
      'material_shortage': 'نقص المواد',
      'technical_issue': 'مشكلة فنية',
      'approval_pending': 'انتظار الموافقة',
      'other': 'أخرى'
    };
    return typeMap[type] || type;
  };

  const exportToPDF = async () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      addArabicFont(doc);

      doc.setFontSize(18);
      doc.text('تقرير تفصيلي للطلبات', doc.internal.pageSize.width / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`من ${startDate} إلى ${endDate}`, doc.internal.pageSize.width / 2, 28, { align: 'center' });

      let yPosition = 40;

      for (const order of filteredOrders) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        // معلومات الطلب
        doc.setFontSize(12);
        doc.setFont('Cairo', 'bold');
        doc.text(`طلب رقم: ${order.order_number}`, doc.internal.pageSize.width - 15, yPosition, { align: 'right' });
        yPosition += 6;
        
        doc.setFontSize(9);
        doc.setFont('Cairo', 'normal');
        doc.text(`العميل: ${order.customer_name}`, doc.internal.pageSize.width - 15, yPosition, { align: 'right' });
        doc.text(`التاريخ: ${new Date(order.created_at).toLocaleDateString('ar-SA')}`, 15, yPosition);
        yPosition += 6;
        doc.text(`الإجمالي: ${order.total_amount.toLocaleString()} ر.س`, doc.internal.pageSize.width - 15, yPosition, { align: 'right' });
        yPosition += 8;

        // بنود الطلب
        if (order.items.length > 0) {
          doc.setFontSize(10);
          doc.setFont('Cairo', 'bold');
          doc.text('بنود الطلب:', doc.internal.pageSize.width - 15, yPosition, { align: 'right' });
          yPosition += 4;

          autoTable(doc, {
            startY: yPosition,
            head: [['الإجمالي', 'السعر', 'الكمية', 'البند']],
            body: order.items.map(item => [
              `${item.total?.toLocaleString() || 0} ر.س`,
              `${item.unit_price?.toLocaleString() || 0} ر.س`,
              item.quantity || 1,
              item.item_name
            ]),
            styles: { font: 'Cairo', fontSize: 8, halign: 'right' },
            headStyles: { fillColor: [59, 130, 246], halign: 'right' },
            margin: { right: 15, left: 15 },
            tableWidth: 'auto'
          });
          yPosition = (doc as any).lastAutoTable.finalY + 6;
        }

        // المستهلكات
        if (order.consumables.length > 0) {
          doc.setFontSize(10);
          doc.setFont('Cairo', 'bold');
          doc.text('المستهلكات:', doc.internal.pageSize.width - 15, yPosition, { align: 'right' });
          yPosition += 4;

          autoTable(doc, {
            startY: yPosition,
            head: [['الإجمالي', 'السعر', 'الكمية', 'المادة']],
            body: order.consumables.map(c => [
              `${c.total?.toLocaleString() || 0} ر.س`,
              `${c.unit_price?.toLocaleString() || 0} ر.س`,
              c.quantity || 1,
              c.material_name
            ]),
            styles: { font: 'Cairo', fontSize: 8, halign: 'right' },
            headStyles: { fillColor: [34, 197, 94], halign: 'right' },
            margin: { right: 15, left: 15 },
            tableWidth: 'auto'
          });
          yPosition = (doc as any).lastAutoTable.finalY + 6;
        }

        // المعوقات
        if (order.obstacles.length > 0) {
          doc.setFontSize(10);
          doc.setFont('Cairo', 'bold');
          doc.text('المعوقات:', doc.internal.pageSize.width - 15, yPosition, { align: 'right' });
          yPosition += 4;

          autoTable(doc, {
            startY: yPosition,
            head: [['تم الإخطار', 'الوصف', 'النوع']],
            body: order.obstacles.map(o => [
              o.customer_notified ? 'نعم' : 'لا',
              o.description,
              getObstacleTypeName(o.obstacle_type)
            ]),
            styles: { font: 'Cairo', fontSize: 8, halign: 'right' },
            headStyles: { fillColor: [239, 68, 68], halign: 'right' },
            margin: { right: 15, left: 15 },
            tableWidth: 'auto'
          });
          yPosition = (doc as any).lastAutoTable.finalY + 6;
        }

        // خط فاصل
        doc.setDrawColor(200, 200, 200);
        doc.line(15, yPosition, doc.internal.pageSize.width - 15, yPosition);
        yPosition += 8;
      }

      doc.save(`orders_detailed_report_${startDate}_to_${endDate}.pdf`);
      toast({ title: "تم التصدير", description: "تم تصدير التقرير بنجاح" });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تصدير التقرير",
        variant: "destructive",
      });
    }
  };

  const exportToExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      // ورقة ملخص الطلبات
      const summaryData = filteredOrders.map(order => ({
        'رقم الطلب': order.order_number,
        'اسم العميل': order.customer_name,
        'تاريخ الطلب': new Date(order.created_at).toLocaleDateString('ar-SA'),
        'الإجمالي': order.total_amount,
        'الحالة': order.status,
        'عدد البنود': order.items.length,
        'عدد المستهلكات': order.consumables.length,
        'عدد المعوقات': order.obstacles.length
      }));
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'ملخص الطلبات');

      // ورقة بنود الطلبات
      const itemsData: any[] = [];
      filteredOrders.forEach(order => {
        order.items.forEach(item => {
          itemsData.push({
            'رقم الطلب': order.order_number,
            'اسم العميل': order.customer_name,
            'البند': item.item_name,
            'الكمية': item.quantity,
            'السعر': item.unit_price,
            'الإجمالي': item.total
          });
        });
      });
      if (itemsData.length > 0) {
        const itemsSheet = XLSX.utils.json_to_sheet(itemsData);
        XLSX.utils.book_append_sheet(workbook, itemsSheet, 'بنود الطلبات');
      }

      // ورقة المستهلكات
      const consumablesData: any[] = [];
      filteredOrders.forEach(order => {
        order.consumables.forEach(c => {
          consumablesData.push({
            'رقم الطلب': order.order_number,
            'اسم العميل': order.customer_name,
            'المادة': c.material_name,
            'الكمية': c.quantity,
            'السعر': c.unit_price,
            'الإجمالي': c.total,
            'ملاحظات': c.notes || ''
          });
        });
      });
      if (consumablesData.length > 0) {
        const consumablesSheet = XLSX.utils.json_to_sheet(consumablesData);
        XLSX.utils.book_append_sheet(workbook, consumablesSheet, 'المستهلكات');
      }

      // ورقة المعوقات
      const obstaclesData: any[] = [];
      filteredOrders.forEach(order => {
        order.obstacles.forEach(o => {
          obstaclesData.push({
            'رقم الطلب': order.order_number,
            'اسم العميل': order.customer_name,
            'نوع المعوقة': getObstacleTypeName(o.obstacle_type),
            'الوصف': o.description,
            'تاريخ التسجيل': new Date(o.created_at).toLocaleDateString('ar-SA'),
            'تم إخطار العميل': o.customer_notified ? 'نعم' : 'لا'
          });
        });
      });
      if (obstaclesData.length > 0) {
        const obstaclesSheet = XLSX.utils.json_to_sheet(obstaclesData);
        XLSX.utils.book_append_sheet(workbook, obstaclesSheet, 'المعوقات');
      }

      XLSX.writeFile(workbook, `orders_detailed_report_${startDate}_to_${endDate}.xlsx`);
      toast({ title: "تم التصدير", description: "تم تصدير التقرير بنجاح" });
    } catch (error) {
      console.error('Excel export error:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تصدير التقرير",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          تقرير تفصيلي للطلبات
        </CardTitle>
        <CardDescription>
          يشمل بنود الطلب والمستهلكات والمعوقات لكل طلب
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* الفلاتر */}
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <Label htmlFor="start-date" className="text-xs">من تاريخ</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <Label htmlFor="end-date" className="text-xs">إلى تاريخ</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="search" className="text-xs">بحث</Label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="بحث برقم الطلب أو اسم العميل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
          <Button onClick={exportToExcel} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Excel
          </Button>
          <Button onClick={exportToPDF} className="gap-2">
            <FileText className="h-4 w-4" />
            PDF
          </Button>
        </div>

        {/* ملخص */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 border rounded-lg bg-primary/5">
            <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
            <p className="text-2xl font-bold">{filteredOrders.length}</p>
          </div>
          <div className="p-4 border rounded-lg bg-success/5">
            <p className="text-sm text-muted-foreground">طلبات بها مستهلكات</p>
            <p className="text-2xl font-bold text-success">
              {filteredOrders.filter(o => o.consumables.length > 0).length}
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-destructive/5">
            <p className="text-sm text-muted-foreground">طلبات بها معوقات</p>
            <p className="text-2xl font-bold text-destructive">
              {filteredOrders.filter(o => o.obstacles.length > 0).length}
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-secondary/50">
            <p className="text-sm text-muted-foreground">إجمالي المبالغ</p>
            <p className="text-2xl font-bold">
              {filteredOrders.reduce((sum, o) => sum + o.total_amount, 0).toLocaleString()} ر.س
            </p>
          </div>
        </div>

        {/* جدول الطلبات */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رقم الطلب</TableHead>
                <TableHead className="text-right">العميل</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">الإجمالي</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-center">البنود</TableHead>
                <TableHead className="text-center">المستهلكات</TableHead>
                <TableHead className="text-center">المعوقات</TableHead>
                <TableHead className="text-center">التفاصيل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <>
                  <TableRow key={order.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>{order.customer_name}</TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>{order.total_amount.toLocaleString()} ر.س</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{order.items.length}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {order.consumables.length > 0 ? (
                        <Badge variant="secondary" className="gap-1">
                          <Package className="h-3 w-3" />
                          {order.consumables.length}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {order.obstacles.length > 0 ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {order.obstacles.length}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleOrderExpand(order.id)}
                      >
                        {expandedOrders.has(order.id) ? 'إخفاء' : 'عرض'}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedOrders.has(order.id) && (
                    <TableRow>
                      <TableCell colSpan={9} className="bg-muted/30 p-4">
                        <div className="grid gap-4 md:grid-cols-3">
                          {/* بنود الطلب */}
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              بنود الطلب ({order.items.length})
                            </h4>
                            {order.items.length > 0 ? (
                              <div className="space-y-1">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="text-sm p-2 bg-background rounded border">
                                    <p className="font-medium">{item.item_name}</p>
                                    <p className="text-muted-foreground">
                                      {item.quantity} × {item.unit_price?.toLocaleString() || 0} = {item.total?.toLocaleString() || 0} ر.س
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">لا توجد بنود</p>
                            )}
                          </div>

                          {/* المستهلكات */}
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm flex items-center gap-2 text-success">
                              <Package className="h-4 w-4" />
                              المستهلكات ({order.consumables.length})
                            </h4>
                            {order.consumables.length > 0 ? (
                              <div className="space-y-1">
                                {order.consumables.map((c, idx) => (
                                  <div key={idx} className="text-sm p-2 bg-success/10 rounded border border-success/20">
                                    <p className="font-medium">{c.material_name}</p>
                                    <p className="text-muted-foreground">
                                      {c.quantity} × {c.unit_price?.toLocaleString() || 0} = {c.total?.toLocaleString() || 0} ر.س
                                    </p>
                                    {c.notes && <p className="text-xs text-muted-foreground mt-1">{c.notes}</p>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">لا توجد مستهلكات</p>
                            )}
                          </div>

                          {/* المعوقات */}
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm flex items-center gap-2 text-destructive">
                              <AlertTriangle className="h-4 w-4" />
                              المعوقات ({order.obstacles.length})
                            </h4>
                            {order.obstacles.length > 0 ? (
                              <div className="space-y-1">
                                {order.obstacles.map((o, idx) => (
                                  <div key={idx} className="text-sm p-2 bg-destructive/10 rounded border border-destructive/20">
                                    <div className="flex items-center justify-between">
                                      <Badge variant="outline" className="text-xs">
                                        {getObstacleTypeName(o.obstacle_type)}
                                      </Badge>
                                      {o.customer_notified && (
                                        <Badge variant="secondary" className="text-xs">تم الإخطار</Badge>
                                      )}
                                    </div>
                                    <p className="mt-1">{o.description}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {new Date(o.created_at).toLocaleDateString('ar-SA')}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">لا توجد معوقات</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
              {filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    لا توجد طلبات في الفترة المحددة
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderDetailedReport;
