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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  Plus,
  Search,
  Edit,
  Phone,
  Mail,
  MapPin,
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

  const handleAddCustomer = async () => {
    console.log('handleAddCustomer called with data:', newCustomer);
    
    if (!newCustomer.name) {
      toast({
        title: "خطأ",
        description: "يرجى ملء اسم العميل",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Attempting to insert customer into database...');
      const { error } = await supabase
        .from('customers')
        .insert([{
          name: newCustomer.name,
          email: newCustomer.email,
          phone: newCustomer.phone,
          whatsapp_number: newCustomer.whatsapp_number,
          company: newCustomer.company,
          address: newCustomer.address,
          city: newCustomer.city,
          notes: newCustomer.notes
        }]);

      if (error) {
        console.error('Error adding customer:', error);
        toast({
          title: "خطأ",
          description: `حدث خطأ في إضافة العميل: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('Customer added successfully, refreshing list...');

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
    console.log('handleUpdateCustomer called with data:', newCustomer);
    console.log('Editing customer:', editingCustomer);
    
    if (!newCustomer.name) {
      toast({
        title: "خطأ",
        description: "يرجى ملء اسم العميل",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Attempting to update customer in database...');
      const { error } = await supabase
        .from('customers')
        .update({
          name: newCustomer.name,
          email: newCustomer.email,
          phone: newCustomer.phone,
          whatsapp_number: newCustomer.whatsapp_number,
          company: newCustomer.company,
          address: newCustomer.address,
          city: newCustomer.city,
          notes: newCustomer.notes
        })
        .eq('id', editingCustomer.id);

      if (error) {
        console.error('Error updating customer:', error);
        toast({
          title: "خطأ",
          description: `حدث خطأ في تحديث العميل: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('Customer updated successfully, refreshing list...');

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
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="gap-2">
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
                  <Label htmlFor="phone">رقم الجوال</Label>
                  <Input 
                    id="phone" 
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    placeholder="+966501234567" 
                  />
                </div>
                <div>
                  <Label htmlFor="whatsapp">رقم الواتساب</Label>
                  <Input 
                    id="whatsapp" 
                    value={newCustomer.whatsapp_number}
                    onChange={(e) => setNewCustomer({ ...newCustomer, whatsapp_number: e.target.value })}
                    placeholder="+966501234567" 
                  />
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
                    variant="default" 
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
                  <Label htmlFor="edit-whatsapp">رقم الواتساب</Label>
                  <Input 
                    id="edit-whatsapp" 
                    value={newCustomer.whatsapp_number}
                    onChange={(e) => setNewCustomer({ ...newCustomer, whatsapp_number: e.target.value })}
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
                    variant="default" 
                    className="flex-1"
                    onClick={handleUpdateCustomer}
                  >
                    حفظ التغييرات
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي العملاء</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">العملاء النشطون</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.filter(c => c.status === 'نشط').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">عملاء الشركات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.filter(c => c.company).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* جدول العملاء */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العميل</TableHead>
                <TableHead>الشركة</TableHead>
                <TableHead>التواصل</TableHead>
                <TableHead>المدينة</TableHead>
                <TableHead>تاريخ الإضافة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{customer.name}</div>
                      {customer.email && (
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {customer.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {customer.company || (
                      <span className="text-muted-foreground">غير محدد</span>
                    )}
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
                        <div className="text-sm text-green-600 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {customer.whatsapp_number}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {customer.city ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {customer.city}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">غير محدد</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(customer.created_at).toLocaleDateString('ar-SA')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCustomer(customer)}
                    >
                      <Edit className="h-4 w-4" />
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

export default Customers;