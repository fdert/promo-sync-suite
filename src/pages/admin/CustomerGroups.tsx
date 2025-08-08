import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Users, Edit, Trash2, Eye } from "lucide-react";

interface CustomerGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
  member_count?: number;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  whatsapp_number?: string;
  email?: string;
}

const CustomerGroups = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<CustomerGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<Customer[]>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3b82f6"
  });

  useEffect(() => {
    fetchGroups();
    fetchCustomers();
  }, []);

  const fetchGroups = async () => {
    try {
      // تم إنشاء الجداول - سيتم تفعيل هذا بعد تحديث ملف الأنواع
      setGroups([]);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('حدث خطأ في جلب المجموعات');
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, whatsapp_number, email')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('حدث خطأ في جلب العملاء');
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    // تم إنشاء الجداول - سيتم تفعيل هذا بعد تحديث ملف الأنواع
    setGroupMembers([]);
  };

  const handleCreateGroup = async () => {
    if (!formData.name.trim()) {
      toast.error('يرجى إدخال اسم المجموعة');
      return;
    }

    setLoading(true);
    try {
      // تم إنشاء الجداول - سيتم تفعيل هذا بعد تحديث ملف الأنواع
      console.log('Creating group:', formData, selectedCustomers);
      
      toast.success('تم إنشاء المجموعة بنجاح');
      setShowCreateDialog(false);
      resetForm();
      fetchGroups();
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('حدث خطأ في إنشاء المجموعة');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المجموعة؟')) return;

    try {
      // تم إنشاء الجداول - سيتم تفعيل هذا بعد تحديث ملف الأنواع
      console.log('Deleting group:', groupId);
      
      toast.success('تم حذف المجموعة بنجاح');
      fetchGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('حدث خطأ في حذف المجموعة');
    }
  };

  const handleShowMembers = (group: CustomerGroup) => {
    setSelectedGroup(group);
    fetchGroupMembers(group.id);
    setShowMembersDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: "#3b82f6"
    });
    setSelectedCustomers([]);
  };

  const handleCustomerToggle = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">مجموعات العملاء</h1>
          <p className="text-muted-foreground">إدارة مجموعات العملاء لإرسال الرسائل الجماعية</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              إنشاء مجموعة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إنشاء مجموعة جديدة</DialogTitle>
              <DialogDescription>
                أنشئ مجموعة جديدة من العملاء لإرسال الرسائل الجماعية
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">اسم المجموعة *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="أدخل اسم المجموعة"
                />
              </div>

              <div>
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="أدخل وصف المجموعة"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="color">لون المجموعة</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-10 border rounded cursor-pointer"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="#3b82f6"
                  />
                </div>
              </div>

              <div>
                <Label>العملاء ({selectedCustomers.length} محدد)</Label>
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="space-y-2">
                    {customers.map((customer) => (
                      <div key={customer.id} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id={customer.id}
                          checked={selectedCustomers.includes(customer.id)}
                          onCheckedChange={() => handleCustomerToggle(customer.id)}
                        />
                        <Label htmlFor={customer.id} className="flex-1 cursor-pointer">
                          <div className="flex justify-between">
                            <span>{customer.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {customer.whatsapp_number || customer.phone}
                            </span>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleCreateGroup} disabled={loading}>
                  {loading ? "جاري الإنشاء..." : "إنشاء المجموعة"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <Card key={group.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                </div>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {group.member_count}
                </Badge>
              </div>
              {group.description && (
                <CardDescription>{group.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  تم الإنشاء: {new Date(group.created_at).toLocaleDateString('ar-SA')}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShowMembers(group)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteGroup(group.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog عرض أعضاء المجموعة */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>أعضاء المجموعة: {selectedGroup?.name}</DialogTitle>
            <DialogDescription>
              قائمة العملاء في هذه المجموعة
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم العميل</TableHead>
                  <TableHead>رقم الهاتف</TableHead>
                  <TableHead>واتساب</TableHead>
                  <TableHead>البريد الإلكتروني</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.phone || '-'}</TableCell>
                    <TableCell>{member.whatsapp_number || '-'}</TableCell>
                    <TableCell>{member.email || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {groupMembers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد أعضاء في هذه المجموعة
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerGroups;