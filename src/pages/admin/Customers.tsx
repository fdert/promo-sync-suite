import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Upload,
  Download,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [existingCustomer, setExistingCustomer] = useState(null);
  const [showExistingCustomer, setShowExistingCustomer] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp_number: "",
    company: "",
    city: "",
    address: "",
    notes: ""
  });

  const { toast } = useToast();

  // جلب العملاء من قاعدة البيانات
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customers:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في جلب بيانات العملاء",
          variant: "destructive",
        });
        return;
      }

      setCustomers(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // تحميل البيانات عند تحميل الصفحة
  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // تصدير بيانات العملاء (الاسم ورقم الجوال فقط)
  const handleExportCustomers = () => {
    try {
      const csvContent = "data:text/csv;charset=utf-8," 
        + "الاسم,رقم الجوال\n"
        + customers.map(customer => 
          `${customer.name || ''},${customer.phone || ''}`
        ).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "نجح",
        description: "تم تصدير بيانات العملاء بنجاح",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تصدير البيانات",
        variant: "destructive",
      });
    }
  };

  // استيراد بيانات العملاء (الاسم ورقم الجوال فقط)
  const handleImportCustomers = async () => {
    if (!importFile) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار ملف للاستيراد",
        variant: "destructive",
      });
      return;
    }

    try {
      const text = await importFile.text();
      console.log('محتوى الملف الخام:', text);
      
      // تنظيف النص وإزالة BOM إذا وجد
      const cleanText = text.replace(/^\uFEFF/, '');
      
      // تقسيم النص بناءً على أنواع مختلفة من فواصل الأسطر
      const rows = cleanText.split(/\r?\n|\r/).filter(row => row.trim());
      console.log('جميع السطور:', rows);
      
      // التحقق إذا كان السطر الأول يحتوي على عناوين
      const hasHeaders = rows.length > 0 && (
        rows[0].includes('الاسم') || 
        rows[0].includes('اسم') || 
        rows[0].includes('Name') ||
        rows[0].includes('name')
      );
      
      // تجاهل السطر الأول إذا كان يحتوي على عناوين
      const dataRows = hasHeaders ? rows.slice(1) : rows;
      console.log('سطور البيانات:', dataRows);
      
      const customers = dataRows
        .map((row, index) => {
          // تنظيف السطر وإزالة المساحات الزائدة
          const cleanRow = row.trim();
          if (!cleanRow) return null;
          
          // تقسيم السطر بناءً على الفاصلة أو الفاصلة المنقوطة أو التاب
          const fields = cleanRow.split(/[,;\t]/).map(field => field?.trim().replace(/"/g, ''));
          const [name, phone] = fields;
          
          console.log(`معالجة السطر ${index + 1}: الاسم="${name}", الهاتف="${phone}"`);
          
          // التحقق من وجود البيانات المطلوبة
          if (!name || !phone || name === '' || phone === '') {
            console.log(`السطر ${index + 1}: بيانات ناقصة`);
            return null;
          }
          
          return {
            name: name,
            phone: phone,
            import_source: 'CSV Import'
          };
        })
        .filter(customer => customer !== null);
        
      console.log('العملاء النهائيون:', customers);

      if (customers.length === 0) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على بيانات صالحة في الملف",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('customers')
        .insert(customers);

      if (error) {
        console.error('Import error:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في استيراد البيانات",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "نجح",
        description: `تم استيراد ${customers.length} عميل بنجاح`,
      });

      setIsImportDialogOpen(false);
      setImportFile(null);
      fetchCustomers();
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في قراءة الملف",
        variant: "destructive",
      });
    }
  };

  // التحقق من وجود رقم الجوال
  const checkExistingPhone = async (phone) => {
    if (!phone || phone.length < 10) return;
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .single();

      if (data && !error) {
        setExistingCustomer(data);
        setShowExistingCustomer(true);
      } else {
        setExistingCustomer(null);
        setShowExistingCustomer(false);
      }
    } catch (error) {
      // العميل غير موجود
      setExistingCustomer(null);
      setShowExistingCustomer(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name) {
      toast({
        title: "خطأ",
        description: "يرجى ملء اسم العميل",
        variant: "destructive",
      });
      return;
    }

    if (!newCustomer.phone) {
      toast({
        title: "خطأ",
        description: "يرجى ملء رقم الجوال",
        variant: "destructive",
      });
      return;
    }

    // التحقق من عدم وجود رقم الجوال مسبقاً
    if (existingCustomer) {
      toast({
        title: "عميل موجود",
        description: "يوجد عميل بنفس رقم الجوال",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('customers')
        .insert([{
          name: newCustomer.name,
          email: newCustomer.email || null,
          phone: newCustomer.phone || null,
          company: newCustomer.company || null,
          address: newCustomer.address || null,
          city: newCustomer.city || null,
          notes: newCustomer.notes || null
        }]);

      if (error) {
        console.error('Error adding customer:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في إضافة العميل",
          variant: "destructive",
        });
        return;
      }

      await fetchCustomers();
      setNewCustomer({
        name: "",
        email: "",
        phone: "",
        whatsapp_number: "",
        company: "",
        city: "",
        address: "",
        notes: ""
      });
      setExistingCustomer(null);
      setShowExistingCustomer(false);
      setIsAddDialogOpen(false);
      
      toast({
        title: "تم إضافة العميل",
        description: "تم إضافة العميل بنجاح",
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setNewCustomer({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      whatsapp_number: customer.whatsapp_number || "",
      company: customer.company,
      city: customer.city,
      address: customer.address || "",
      notes: customer.notes || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateCustomer = async () => {
    if (!newCustomer.name) {
      toast({
        title: "خطأ",
        description: "يرجى ملء اسم العميل",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: newCustomer.name,
          email: newCustomer.email || null,
          phone: newCustomer.phone || null,
          company: newCustomer.company || null,
          address: newCustomer.address || null,
          city: newCustomer.city || null,
          notes: newCustomer.notes || null
        })
        .eq('id', editingCustomer.id);

      if (error) {
        console.error('Error updating customer:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في تحديث العميل",
          variant: "destructive",
        });
        return;
      }

      await fetchCustomers();
      setNewCustomer({
        name: "",
        email: "",
        phone: "",
        whatsapp_number: "",
        company: "",
        city: "",
        address: "",
        notes: ""
      });
      setIsEditDialogOpen(false);
      setEditingCustomer(null);
      
      toast({
        title: "تم تحديث العميل",
        description: "تم تحديث بيانات العميل بنجاح",
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const confirmDeleteCustomer = (customer) => {
    setCustomerToDelete(customer);
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    
    try {
      // أولاً التحقق من وجود طلبات أو فواتير مرتبطة بالعميل
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('customer_id', customerToDelete.id);
        
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id')
        .eq('customer_id', customerToDelete.id);
        
      if (orders?.length > 0 || invoices?.length > 0) {
        toast({
          title: "لا يمكن حذف العميل",
          description: "يوجد طلبات أو فواتير مرتبطة بهذا العميل. يرجى حذفها أولاً.",
          variant: "destructive",
        });
        setCustomerToDelete(null);
        return;
      }

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerToDelete.id);

      if (error) {
        console.error('Error deleting customer:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في حذف العميل: " + error.message,
          variant: "destructive",
        });
        return;
      }

      await fetchCustomers();
      
      toast({
        title: "تم حذف العميل",
        description: `تم حذف العميل ${customerToDelete.name} بنجاح`,
      });
      
      setCustomerToDelete(null);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع في حذف العميل",
        variant: "destructive",
      });
      setCustomerToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري تحميل العملاء...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* العنوان والإحصائيات */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            إدارة العملاء
          </h1>
          <p className="text-muted-foreground mt-1">
            قاعدة بيانات شاملة لجميع عملاء الوكالة
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث عن عميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Button onClick={handleExportCustomers} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            تصدير
          </Button>
          
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                استيراد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>استيراد العملاء</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="import-file">اختر ملف CSV</Label>
                  <Input
                    id="import-file"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    الملف يجب أن يحتوي على عمودين: الاسم، رقم الجوال
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsImportDialogOpen(false);
                      setImportFile(null);
                    }}
                  >
                    إلغاء
                  </Button>
                  <Button onClick={handleImportCustomers}>
                    استيراد
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة عميل جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>إضافة عميل جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">اسم العميل</Label>
                  <Input 
                    id="name" 
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="أدخل اسم العميل" 
                  />
                </div>
                <div>
                  <Label htmlFor="email">البريد الإلكتروني (اختياري)</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    placeholder="example@domain.com" 
                  />
                </div>
                <div>
                  <Label htmlFor="phone">رقم الجوال *</Label>
                  <Input 
                    id="phone" 
                    value={newCustomer.phone}
                    onChange={(e) => {
                      setNewCustomer({ ...newCustomer, phone: e.target.value });
                      checkExistingPhone(e.target.value);
                    }}
                    placeholder="+966501234567" 
                  />
                  {showExistingCustomer && existingCustomer && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm font-medium text-yellow-800">
                        ⚠️ يوجد عميل بنفس رقم الجوال:
                      </p>
                      <p className="text-sm text-yellow-700">
                        الاسم: {existingCustomer.name}
                      </p>
                      {existingCustomer.company && (
                        <p className="text-sm text-yellow-700">
                          الشركة: {existingCustomer.company}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => handleEditCustomer(existingCustomer)}
                        className="mt-2 text-xs text-blue-600 underline"
                      >
                        تعديل بيانات العميل الموجود
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="company">اسم الشركة/المؤسسة</Label>
                  <Input 
                    id="company" 
                    value={newCustomer.company}
                    onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                    placeholder="اختياري" 
                  />
                </div>
                <div>
                  <Label htmlFor="city">المدينة (اختياري)</Label>
                  <Input 
                    id="city" 
                    value={newCustomer.city}
                    onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                    placeholder="الرياض" 
                  />
                </div>
                <div>
                  <Label htmlFor="notes">ملاحظات</Label>
                  <Textarea 
                    id="notes" 
                    value={newCustomer.notes}
                    onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                    placeholder="أي ملاحظات إضافية..." 
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="hero" 
                    className="flex-1"
                    onClick={handleAddCustomer}
                  >
                    حفظ العميل
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Customer Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>تعديل بيانات العميل</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">اسم العميل</Label>
                  <Input 
                    id="edit-name" 
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="أدخل اسم العميل" 
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">البريد الإلكتروني (اختياري)</Label>
                  <Input 
                    id="edit-email" 
                    type="email" 
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    placeholder="example@domain.com" 
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">رقم الجوال</Label>
                  <Input 
                    id="edit-phone" 
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    placeholder="+966501234567" 
                  />
                </div>
                <div>
                  <Label htmlFor="edit-company">اسم الشركة/المؤسسة</Label>
                  <Input 
                    id="edit-company" 
                    value={newCustomer.company}
                    onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                    placeholder="اختياري" 
                  />
                </div>
                <div>
                  <Label htmlFor="edit-city">المدينة (اختياري)</Label>
                  <Input 
                    id="edit-city" 
                    value={newCustomer.city}
                    onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                    placeholder="الرياض" 
                  />
                </div>
                <div>
                  <Label htmlFor="edit-notes">ملاحظات</Label>
                  <Textarea 
                    id="edit-notes" 
                    value={newCustomer.notes}
                    onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                    placeholder="أي ملاحظات إضافية..." 
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="hero" 
                    className="flex-1"
                    onClick={handleUpdateCustomer}
                  >
                    تحديث البيانات
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي العملاء</p>
                <p className="text-xl font-bold">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-success/10 p-2 rounded-lg">
                <Users className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">عملاء نشطون</p>
                <p className="text-xl font-bold">{customers.filter(c => c.status === 'نشط').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-accent/10 p-2 rounded-lg">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">عملاء جدد هذا الشهر</p>
                <p className="text-xl font-bold">{customers.filter(c => {
                  const created = new Date(c.created_at);
                  const now = new Date();
                  return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
                }).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-warning/10 p-2 rounded-lg">
                <Users className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">متوسط الطلبات</p>
                <p className="text-xl font-bold">{customers.length > 0 ? Math.round(customers.reduce((sum, c) => sum + (c.total_orders || 0), 0) / customers.length) : 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* جدول العملاء */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة العملاء</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم العميل</TableHead>
                <TableHead>الشركة</TableHead>
                <TableHead>معلومات التواصل</TableHead>
                <TableHead>المدينة</TableHead>
                <TableHead>عدد الطلبات</TableHead>
                <TableHead>إجمالي المبلغ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        انضم في {new Date(customer.created_at).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{customer.company || 'غير محدد'}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3" />
                        {customer.phone || 'غير محدد'}
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3" />
                        {customer.email || 'غير محدد'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {customer.city || 'غير محدد'}
                    </div>
                  </TableCell>
                  <TableCell>{customer.total_orders || 0}</TableCell>
                  <TableCell className="font-medium">{customer.total_spent || '0 ر.س'}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-success/10 text-success rounded-full text-xs font-medium">
                      {customer.status || 'نشط'}
                    </span>
                  </TableCell>
                  <TableCell>
                  <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditCustomer(customer)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => confirmDeleteCustomer(customer)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* حوار تأكيد حذف العميل */}
      <AlertDialog open={customerToDelete !== null} onOpenChange={() => setCustomerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف العميل</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف العميل "{customerToDelete?.name}"؟ 
              <br />
              سيتم التحقق من وجود طلبات أو فواتير مرتبطة قبل الحذف.
              <br />
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCustomer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف العميل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Customers;