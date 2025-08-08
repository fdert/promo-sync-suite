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
import Papa from 'papaparse';

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

  // استيراد بيانات العملاء باستخدام PapaParse (الاسم ورقم الجوال فقط)
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
      Papa.parse(importFile, {
        encoding: "UTF-8",
        skipEmptyLines: true,
        header: false,
        complete: async (results) => {
          console.log('نتائج PapaParse:', results);
          
          if (results.errors.length > 0) {
            console.error('أخطاء في تحليل الملف:', results.errors);
          }
          
          const rows = results.data as string[][];
          console.log('السطور المستخرجة:', rows);
          
          if (rows.length === 0) {
            toast({
              title: "خطأ",
              description: "الملف فارغ أو لا يحتوي على بيانات صالحة",
              variant: "destructive",
            });
            return;
          }
          
          // تحديد ما إذا كان السطر الأول يحتوي على عناوين
          const firstRow = rows[0];
          const hasHeaders = firstRow && (
            firstRow[0]?.includes('الاسم') || 
            firstRow[0]?.includes('اسم') || 
            firstRow[0]?.includes('Name') ||
            firstRow[0]?.includes('name') ||
            firstRow[1]?.includes('رقم') ||
            firstRow[1]?.includes('جوال') ||
            firstRow[1]?.includes('phone')
          );
          
          // البدء من السطر المناسب
          const dataRows = hasHeaders ? rows.slice(1) : rows;
          console.log('سطور البيانات بعد إزالة العناوين:', dataRows);
          
          const newCustomers = dataRows
            .map((row, index) => {
              if (!row || row.length < 2) {
                console.log(`السطر ${index + 1}: بيانات ناقصة`);
                return null;
              }
              
              const name = row[0]?.toString().trim();
              const phone = row[1]?.toString().trim();
              
              console.log(`معالجة السطر ${index + 1}: الاسم="${name}", الهاتف="${phone}"`);
              
              if (!name || !phone || name === '' || phone === '') {
                console.log(`السطر ${index + 1}: بيانات فارغة`);
                return null;
              }
              
              return {
                name: name,
                phone: phone,
                import_source: 'CSV Import'
              };
            })
            .filter(customer => customer !== null);
            
          console.log('العملاء الجدد قبل فحص التكرار:', newCustomers);

          if (newCustomers.length === 0) {
            toast({
              title: "خطأ",
              description: "لم يتم العثور على بيانات صالحة في الملف",
              variant: "destructive",
            });
            return;
          }

          // فحص التكرار مع العملاء الموجودين
          const existingPhones = customers.map(c => c.phone);
          const uniqueCustomers = newCustomers.filter(newCustomer => 
            !existingPhones.includes(newCustomer.phone)
          );
          
          // إزالة التكرار داخل البيانات المستوردة نفسها
          const finalCustomers = uniqueCustomers.filter((customer, index, self) =>
            index === self.findIndex(c => c.phone === customer.phone)
          );
          
          const duplicateCount = newCustomers.length - finalCustomers.length;
          
          console.log('العملاء النهائيون بعد إزالة التكرار:', finalCustomers);

          if (finalCustomers.length === 0) {
            toast({
              title: "تنبيه",
              description: `جميع العملاء موجودون مسبقاً (${duplicateCount} عميل متكرر)`,
              variant: "destructive",
            });
            return;
          }

          const { error } = await supabase
            .from('customers')
            .insert(finalCustomers);

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
            description: `تم استيراد ${finalCustomers.length} عميل بنجاح${duplicateCount > 0 ? ` (تم تجاهل ${duplicateCount} عميل متكرر)` : ''}`,
          });

          setIsImportDialogOpen(false);
          setImportFile(null);
          fetchCustomers();
        },
        error: (error) => {
          console.error('خطأ في تحليل الملف:', error);
          toast({
            title: "خطأ",
            description: "حدث خطأ في قراءة الملف. تأكد من أن الملف بصيغة CSV صحيحة",
            variant: "destructive",
          });
        }
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في قراءة الملف",
        variant: "destructive",
      });
    }
  };

  // حذف العملاء المتكررين حسب رقم الجوال
  const handleRemoveDuplicates = async () => {
    try {
      // البحث عن العملاء المتكررين
      const phoneGroups: { [key: string]: any[] } = {};
      customers.forEach(customer => {
        if (customer.phone) {
          if (!phoneGroups[customer.phone]) {
            phoneGroups[customer.phone] = [];
          }
          phoneGroups[customer.phone].push(customer);
        }
      });

      // العثور على المتكررين
      const duplicates: any[] = [];
      Object.values(phoneGroups).forEach((group: any[]) => {
        if (group.length > 1) {
          // الاحتفاظ بالأحدث وحذف الباقي
          const sorted = group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          duplicates.push(...sorted.slice(1)); // حذف كل شيء عدا الأول (الأحدث)
        }
      });

      if (duplicates.length === 0) {
        toast({
          title: "لا توجد متكررات",
          description: "لا توجد عملاء متكررين للحذف",
        });
        return;
      }

      // حذف العملاء المتكررين
      const { error } = await supabase
        .from('customers')
        .delete()
        .in('id', duplicates.map(d => d.id));

      if (error) {
        throw error;
      }

      await fetchCustomers();
      
      toast({
        title: "تم حذف المتكررين",
        description: `تم حذف ${duplicates.length} عميل متكرر بنجاح`,
      });
    } catch (error) {
      console.error('Error removing duplicates:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في حذف العملاء المتكررين",
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
          
          <Button onClick={handleRemoveDuplicates} variant="outline" className="gap-2">
            <Trash2 className="h-4 w-4" />
            حذف المتكررين
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