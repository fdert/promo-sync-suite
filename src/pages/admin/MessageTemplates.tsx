// @ts-nocheck
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Plus, Save, Copy, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  is_active: boolean;
  variables?: any;
  created_at: string;
  updated_at: string;
}

const MessageTemplates = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<MessageTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    content: ""
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const availableVariables = [
    "customer_name", "customer_phone", "order_number", "order_status",
    "service_name", "amount", "paid_amount", "remaining_amount",
    "order_items", "payments_details", "delivery_date", "delivery_time",
    "estimated_time", "evaluation_link", "evaluation_code",
    "company_name", "description", "progress", "timestamp",
    "total_due", "unpaid_orders_count", "earliest_due_date", "report_date",
    "orders_section", "payments_section", "invoice_number",
    "due_date", "payment_date", "date", "time",
    "delay_days", "outstanding_balance", "oldest_order", "order_date",
    "total_payments", "total_expenses", "net_profit", "profit_icon",
    "new_orders_count", "completed_orders_count", "settings_status",
    "pending_messages", "recent_orders", "notify_new_order",
    "notify_delivery_delay", "notify_payment_delay", "notify_whatsapp_failure",
    "notify_expense", "daily_report", "delivery_delay_days", "payment_delay_days"
  ];

  useEffect(() => {
    fetchTemplates();
    createDefaultTemplatesIfNeeded();
  }, []);

  // Create default templates if they don't exist
  const createDefaultTemplatesIfNeeded = async () => {
    try {
      // Check if outstanding_balance_report template exists
      const { data: existing } = await supabase
        .from('message_templates')
        .select('id')
        .eq('name', 'outstanding_balance_report')
        .maybeSingle();

      if (!existing) {
        // Create the template
        await supabase
          .from('message_templates')
          .insert({
            name: 'outstanding_balance_report',
            content: `━━━━━━━━━━━━━━━━━━━━━━
📊 *ملخص الحساب المالي*
━━━━━━━━━━━━━━━━━━━━━━

🔹 *اسم العميل:* {{customer_name}}
🔹 *تاريخ التقرير:* {{report_date}}

━━━━━━━━━━━━━━━━━━━━━━
💰 *الرصيد المالي*
━━━━━━━━━━━━━━━━━━━━━━

🔴 *إجمالي المبلغ المستحق:* {{total_due}}
📋 *عدد الطلبات غير المسددة:* {{unpaid_orders_count}}
⏰ *أقرب تاريخ استحقاق:* {{earliest_due_date}}

━━━━━━━━━━━━━━━━━━━━━━
📦 *تفاصيل الطلبات غير المسددة*
━━━━━━━━━━━━━━━━━━━━━━

{{orders_section}}

━━━━━━━━━━━━━━━━━━━━━━
💳 *آخر المدفوعات*
━━━━━━━━━━━━━━━━━━━━━━

{{payments_section}}

━━━━━━━━━━━━━━━━━━━━━━
📞 *للاستفسار أو السداد*
نرجو التواصل معنا
━━━━━━━━━━━━━━━━━━━━━━`,
            is_active: true
          });
        
        console.log('✅ تم إنشاء قالب العملاء المدينين بنجاح');
      }
    } catch (error) {
      console.error('Error creating default templates:', error);
    }
  };

  useEffect(() => {
    filterTemplates();
  }, [templates, searchTerm]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب قوالب الرسائل",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    if (!searchTerm) {
      setFilteredTemplates(templates);
    } else {
      setFilteredTemplates(
        templates.filter(t => 
          t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.content.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
  };

  const handleSaveTemplate = async () => {
    try {
      if (editingTemplate) {
        // تحديث قالب موجود
        const { error } = await supabase
          .from('message_templates')
          .update({
            content: editingTemplate.content,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;

        toast({
          title: "تم التحديث",
          description: "تم تحديث القالب بنجاح"
        });
      } else {
        // إنشاء قالب جديد
        const { error } = await supabase
          .from('message_templates')
          .insert([{
            name: newTemplate.name,
            content: newTemplate.content,
            is_active: true
          }]);

        if (error) throw error;

        toast({
          title: "تم الإنشاء",
          description: "تم إنشاء القالب بنجاح"
        });

        setNewTemplate({
          name: "",
          content: ""
        });
      }

      setIsDialogOpen(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ القالب",
        variant: "destructive"
      });
    }
  };

  const handleEditTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };

  const insertVariable = (variable: string, isEditing: boolean = false) => {
    const variableText = `{{${variable}}}`;
    
    if (isEditing && editingTemplate) {
      setEditingTemplate({
        ...editingTemplate,
        content: editingTemplate.content + variableText
      });
    } else {
      setNewTemplate({
        ...newTemplate,
        content: newTemplate.content + variableText
      });
    }
  };

  const previewMessage = (template: MessageTemplate) => {
    let preview = template.content;
    
    // استبدال المتغيرات بقيم تجريبية
    availableVariables.forEach(variable => {
      const regex = new RegExp(`{{${variable}}}`, 'g');
      switch (variable) {
        case 'customer_name':
          preview = preview.replace(regex, 'أحمد محمد');
          break;
        case 'customer_phone':
          preview = preview.replace(regex, '+966501234567');
          break;
        case 'order_number':
          preview = preview.replace(regex, 'ORD-20250120-001');
          break;
        case 'order_status':
          preview = preview.replace(regex, 'قيد التنفيذ');
          break;
        case 'service_name':
          preview = preview.replace(regex, 'طباعة أكريليك');
          break;
        case 'amount':
          preview = preview.replace(regex, '1,500.00');
          break;
        case 'paid_amount':
          preview = preview.replace(regex, '1,000.00');
          break;
        case 'remaining_amount':
          preview = preview.replace(regex, '500.00');
          break;
        case 'order_items':
          preview = preview.replace(regex, '• لوحة أكريليك: 2 × 150.00 = 300.00 ر.س\n• حروف بارزة: 1 × 200.00 = 200.00 ر.س');
          break;
        case 'payments_details':
          preview = preview.replace(regex, '• ٢٠‏/١‏/٢٠٢٥ م: 500.00 ر.س (cash)\n• ١٥‏/١‏/٢٠٢٥ م: 500.00 ر.س (bank_transfer)');
          break;
        case 'delivery_date':
          preview = preview.replace(regex, '٢٥‏/١‏/٢٠٢٥ م');
          break;
        case 'delivery_time':
          preview = preview.replace(regex, '15:00');
          break;
        case 'estimated_time':
          preview = preview.replace(regex, '3 أيام عمل');
          break;
        case 'evaluation_link':
          preview = preview.replace(regex, 'https://example.com/evaluation/abc123');
          break;
        case 'evaluation_code':
          preview = preview.replace(regex, 'ABC123');
          break;
        case 'company_name':
          preview = preview.replace(regex, 'إدارة المتابعة');
          break;
        case 'description':
          preview = preview.replace(regex, 'ملاحظات خاصة بالطلب');
          break;
        case 'progress':
          preview = preview.replace(regex, '75');
          break;
        case 'timestamp':
          preview = preview.replace(regex, new Date().toLocaleString('ar-SA'));
          break;
        case 'total_due':
          preview = preview.replace(regex, '1,500 ر.س');
          break;
        case 'unpaid_orders_count':
          preview = preview.replace(regex, '3');
          break;
        case 'earliest_due_date':
          preview = preview.replace(regex, '15/02/2024');
          break;
        case 'report_date':
          preview = preview.replace(regex, '01/02/2024 - 14:30');
          break;
        case 'orders_section':
          preview = preview.replace(regex, '1. رقم الطلب: ORD-001\n   المبلغ: 500 ر.س\n2. رقم الطلب: ORD-002\n   المبلغ: 1000 ر.س');
          break;
        case 'payments_section':
          preview = preview.replace(regex, '1. المبلغ: 300 ر.س - نقدي - 20/01/2024\n2. المبلغ: 200 ر.س - تحويل - 15/01/2024');
          break;
        case 'invoice_number':
          preview = preview.replace(regex, 'INV-001');
          break;
        case 'due_date':
          preview = preview.replace(regex, '15/02/2024');
          break;
        case 'payment_date':
          preview = preview.replace(regex, '01/02/2024');
          break;
        case 'date':
          preview = preview.replace(regex, new Date().toLocaleDateString('ar-SA'));
          break;
        case 'time':
          preview = preview.replace(regex, new Date().toLocaleTimeString('ar-SA'));
          break;
        case 'delay_days':
          preview = preview.replace(regex, '3');
          break;
        case 'outstanding_balance':
          preview = preview.replace(regex, '1,500.00');
          break;
        case 'oldest_order':
          preview = preview.replace(regex, 'ORD-20250101-001');
          break;
        case 'order_date':
          preview = preview.replace(regex, '01/01/2025');
          break;
        case 'total_payments':
          preview = preview.replace(regex, '5,000.00');
          break;
        case 'total_expenses':
          preview = preview.replace(regex, '2,000.00');
          break;
        case 'net_profit':
          preview = preview.replace(regex, '3,000.00');
          break;
        case 'profit_icon':
          preview = preview.replace(regex, '✅');
          break;
        case 'new_orders_count':
          preview = preview.replace(regex, '5');
          break;
        case 'completed_orders_count':
          preview = preview.replace(regex, '3');
          break;
        case 'settings_status':
          preview = preview.replace(regex, 'نشط');
          break;
        case 'pending_messages':
          preview = preview.replace(regex, '2');
          break;
        case 'recent_orders':
          preview = preview.replace(regex, '4');
          break;
        case 'notify_new_order':
        case 'notify_delivery_delay':
        case 'notify_payment_delay':
        case 'notify_whatsapp_failure':
        case 'notify_expense':
        case 'daily_report':
          preview = preview.replace(regex, 'مفعّل');
          break;
        case 'delivery_delay_days':
          preview = preview.replace(regex, '3');
          break;
        case 'payment_delay_days':
          preview = preview.replace(regex, '7');
          break;
        default:
          preview = preview.replace(regex, `[${variable}]`);
      }
    });
    
    return preview;
  };

  if (loading) {
    return <div className="flex justify-center p-8">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">قوالب رسائل الواتس آب</h1>
          <p className="text-muted-foreground mt-1">
            إدارة قوالب الرسائل والمتغيرات المستخدمة في إشعارات الواتس آب
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingTemplate(null);
              setNewTemplate({
                name: "",
                content: ""
              });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              قالب جديد
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "تعديل القالب" : "إنشاء قالب جديد"}
              </DialogTitle>
              <DialogDescription>
                قم بإنشاء أو تعديل قالب رسالة الواتس آب مع استخدام المتغيرات
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-6">
              {/* نموذج التعديل */}
              <div className="space-y-4">
                {!editingTemplate && (
                  <div>
                    <Label htmlFor="template_name">اسم القالب</Label>
                    <Input
                      id="template_name"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({
                        ...newTemplate,
                        name: e.target.value
                      })}
                      placeholder="مثال: outstanding_balance_report"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="template_content">محتوى الرسالة</Label>
                  <Textarea
                    id="template_content"
                    value={editingTemplate ? editingTemplate.content : newTemplate.content}
                    onChange={(e) => {
                      if (editingTemplate) {
                        setEditingTemplate({
                          ...editingTemplate,
                          content: e.target.value
                        });
                      } else {
                        setNewTemplate({
                          ...newTemplate,
                          content: e.target.value
                        });
                      }
                    }}
                    placeholder="اكتب محتوى الرسالة هنا واستخدم المتغيرات مثل {{customer_name}}"
                    rows={12}
                  />
                </div>

                {/* المتغيرات المتاحة */}
                <div>
                  <Label>المتغيرات المتاحة</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    اضغط على أي متغير لإضافته إلى الرسالة
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableVariables.map(variable => (
                      <Button
                        key={variable}
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable(variable, !!editingTemplate)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        {`{{${variable}}}`}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* معاينة الرسالة */}
                <div className="border rounded-lg p-4 bg-muted/50">
                  <Label className="font-semibold mb-2 block">
                    <Eye className="h-4 w-4 inline mr-1" />
                    معاينة الرسالة
                  </Label>
                  <p className="text-sm bg-background p-3 rounded border whitespace-pre-wrap">
                    {editingTemplate 
                      ? previewMessage(editingTemplate)
                      : previewMessage({
                          id: '',
                          name: newTemplate.name,
                          content: newTemplate.content,
                          is_active: true,
                          created_at: '',
                          updated_at: ''
                        })
                    }
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSaveTemplate}>
                <Save className="h-4 w-4 mr-2" />
                حفظ القالب
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* بحث وفلترة القوالب */}
      <Card>
        <CardHeader>
          <CardTitle>بحث في القوالب</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="ابحث في القوالب بالاسم أو المحتوى..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* جدول القوالب */}
      <Card>
        <CardHeader>
          <CardTitle>قوالب الرسائل</CardTitle>
          <CardDescription>
            إدارة جميع قوالب رسائل الواتس آب المتاحة في النظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم القالب</TableHead>
                <TableHead>محتوى الرسالة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">
                    {template.name}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="truncate">
                      {template.content.substring(0, 150)}
                      {template.content.length > 150 && "..."}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.is_active ? "default" : "secondary"}>
                      {template.is_active ? "نشط" : "غير نشط"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTemplate(template)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
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

export default MessageTemplates;