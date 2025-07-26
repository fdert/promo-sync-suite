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
  template_name: string;
  template_content: string;
  template_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const MessageTemplates = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<MessageTemplate[]>([]);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    template_name: "",
    template_content: "",
    template_type: "general"
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const templateTypes = [
    { value: "order", label: "الطلبات" },
    { value: "invoice", label: "الفواتير" },
    { value: "general", label: "عام" },
    { value: "quick_reply", label: "رد سريع" }
  ];

  const availableVariables = {
    order: [
      "customer_name", "order_number", "progress", "amount", 
      "due_date", "service_name", "estimated_time", "paid_amount",
      "remaining_amount", "payment_type", "payment_notes", 
      "order_items", "order_items_count", "order_items_total"
    ],
    invoice: [
      "customer_name", "invoice_number", "amount", "due_date", 
      "payment_date", "status", "paid_amount", "remaining_amount",
      "payment_type", "invoice_items", "invoice_items_count"
    ],
    general: [
      "customer_name", "company_name", "date", "time"
    ]
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, selectedType]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('template_type', { ascending: true })
        .order('template_name', { ascending: true });

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
    if (selectedType === "all") {
      setFilteredTemplates(templates);
    } else {
      setFilteredTemplates(templates.filter(t => t.template_type === selectedType));
    }
  };

  const handleSaveTemplate = async () => {
    try {
      if (editingTemplate) {
        // تحديث قالب موجود
        const { error } = await supabase
          .from('message_templates')
          .update({
            template_content: editingTemplate.template_content,
            template_type: editingTemplate.template_type,
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
            template_name: newTemplate.template_name,
            template_content: newTemplate.template_content,
            template_type: newTemplate.template_type,
            is_active: true
          }]);

        if (error) throw error;

        toast({
          title: "تم الإنشاء",
          description: "تم إنشاء القالب بنجاح"
        });

        setNewTemplate({
          template_name: "",
          template_content: "",
          template_type: "general"
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
        template_content: editingTemplate.template_content + variableText
      });
    } else {
      setNewTemplate({
        ...newTemplate,
        template_content: newTemplate.template_content + variableText
      });
    }
  };

  const previewMessage = (template: MessageTemplate) => {
    let preview = template.template_content;
    const variables = availableVariables[template.template_type as keyof typeof availableVariables] || [];
    
    // استبدال المتغيرات بقيم تجريبية
    variables.forEach(variable => {
      const regex = new RegExp(`{{${variable}}}`, 'g');
      switch (variable) {
        case 'customer_name':
          preview = preview.replace(regex, 'أحمد محمد');
          break;
        case 'order_number':
          preview = preview.replace(regex, 'ORD-001');
          break;
        case 'invoice_number':
          preview = preview.replace(regex, 'INV-001');
          break;
        case 'amount':
          preview = preview.replace(regex, '1,500 ر.س');
          break;
        case 'paid_amount':
          preview = preview.replace(regex, '1,000 ر.س');
          break;
        case 'remaining_amount':
          preview = preview.replace(regex, '500 ر.س');
          break;
        case 'payment_type':
          preview = preview.replace(regex, 'تحويل بنكي');
          break;
        case 'payment_notes':
          preview = preview.replace(regex, 'تم الدفع جزئياً');
          break;
        case 'order_items':
          preview = preview.replace(regex, '1. تصميم شعار - الكمية: 1 - السعر: 500 ر.س\n2. تطوير موقع - الكمية: 1 - السعر: 1000 ر.س');
          break;
        case 'order_items_count':
          preview = preview.replace(regex, '2');
          break;
        case 'order_items_total':
          preview = preview.replace(regex, '1,500 ر.س');
          break;
        case 'invoice_items':
          preview = preview.replace(regex, 'البند الأول، البند الثاني');
          break;
        case 'invoice_items_count':
          preview = preview.replace(regex, '2');
          break;
        case 'progress':
          preview = preview.replace(regex, '75%');
          break;
        case 'due_date':
          preview = preview.replace(regex, '2024-02-15');
          break;
        case 'service_name':
          preview = preview.replace(regex, 'تصميم شعار');
          break;
        case 'estimated_time':
          preview = preview.replace(regex, '5 أيام');
          break;
        case 'company_name':
          preview = preview.replace(regex, 'شركة المثال');
          break;
        case 'date':
          preview = preview.replace(regex, new Date().toLocaleDateString('ar-SA'));
          break;
        case 'time':
          preview = preview.replace(regex, new Date().toLocaleTimeString('ar-SA'));
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
                template_name: "",
                template_content: "",
                template_type: "general"
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* نموذج التعديل */}
              <div className="space-y-4">
                {!editingTemplate && (
                  <div>
                    <Label htmlFor="template_name">اسم القالب</Label>
                    <Input
                      id="template_name"
                      value={newTemplate.template_name}
                      onChange={(e) => setNewTemplate({
                        ...newTemplate,
                        template_name: e.target.value
                      })}
                      placeholder="مثال: order_reminder"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="template_type">نوع القالب</Label>
                  <Select
                    value={editingTemplate ? editingTemplate.template_type : newTemplate.template_type}
                    onValueChange={(value) => {
                      if (editingTemplate) {
                        setEditingTemplate({
                          ...editingTemplate,
                          template_type: value
                        });
                      } else {
                        setNewTemplate({
                          ...newTemplate,
                          template_type: value
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {templateTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="template_content">محتوى الرسالة</Label>
                  <Textarea
                    id="template_content"
                    value={editingTemplate ? editingTemplate.template_content : newTemplate.template_content}
                    onChange={(e) => {
                      if (editingTemplate) {
                        setEditingTemplate({
                          ...editingTemplate,
                          template_content: e.target.value
                        });
                      } else {
                        setNewTemplate({
                          ...newTemplate,
                          template_content: e.target.value
                        });
                      }
                    }}
                    placeholder="اكتب محتوى الرسالة هنا واستخدم المتغيرات مثل {{customer_name}}"
                    rows={6}
                  />
                </div>
              </div>

              {/* المتغيرات المتاحة */}
              <div className="space-y-4">
                <div>
                  <Label>المتغيرات المتاحة</Label>
                  <p className="text-sm text-muted-foreground">
                    اضغط على أي متغير لإضافته إلى الرسالة
                  </p>
                </div>

                <div className="space-y-2">
                  {availableVariables[
                    (editingTemplate ? editingTemplate.template_type : newTemplate.template_type) as keyof typeof availableVariables
                  ]?.map(variable => (
                    <Button
                      key={variable}
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable(variable, !!editingTemplate)}
                      className="mr-2 mb-2"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      {`{{${variable}}}`}
                    </Button>
                  ))}
                </div>

                {/* معاينة الرسالة */}
                <div className="border rounded-lg p-4 bg-muted/50">
                  <Label className="font-semibold mb-2 block">
                    <Eye className="h-4 w-4 inline mr-1" />
                    معاينة الرسالة
                  </Label>
                  <p className="text-sm bg-background p-3 rounded border">
                    {editingTemplate 
                      ? previewMessage(editingTemplate)
                      : previewMessage({
                          id: '',
                          template_name: newTemplate.template_name,
                          template_content: newTemplate.template_content,
                          template_type: newTemplate.template_type,
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

      {/* فلترة القوالب */}
      <Card>
        <CardHeader>
          <CardTitle>فلترة القوالب</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="اختر نوع القالب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع القوالب</SelectItem>
              {templateTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                <TableHead>النوع</TableHead>
                <TableHead>محتوى الرسالة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">
                    {template.template_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {templateTypes.find(t => t.value === template.template_type)?.label || template.template_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="truncate">
                      {template.template_content.substring(0, 100)}
                      {template.template_content.length > 100 && "..."}
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