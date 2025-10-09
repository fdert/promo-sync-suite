// @ts-nocheck
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
  created_at: string;
  member_count?: number;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
}

const CustomerGroups = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<CustomerGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<Customer[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [editCustomerSearchTerm, setEditCustomerSearchTerm] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    description: ""
  });

  useEffect(() => {
    fetchGroups();
    fetchCustomers();
  }, []);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_groups')
        .select('*')
        .order('name');

      if (error) throw error;
      
      // إضافة عدد الأعضاء لكل مجموعة
      const groupsWithCounts = await Promise.all(
        (data || []).map(async (group) => {
          const { count } = await supabase
            .from('customer_group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);
          
          return {
            ...group,
            member_count: count || 0
          };
        })
      );
      
      setGroups(groupsWithCounts);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('حدث خطأ في جلب المجموعات');
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, whatsapp, email')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('حدث خطأ في جلب العملاء');
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      console.log('جلب أعضاء المجموعة:', groupId);
      
      const { data, error } = await supabase
        .from('customer_group_members')
        .select(`
          customer_id,
          customers (
            id,
            name,
            phone,
            whatsapp,
            email
          )
        `)
        .eq('group_id', groupId);

      if (error) {
        console.error('خطأ في جلب أعضاء المجموعة:', error);
        throw error;
      }

      console.log('بيانات أعضاء المجموعة:', data);

      // تحويل البيانات للشكل المطلوب
      const members = (data || [])
        .filter(item => item.customers) // التأكد من وجود بيانات العميل
        .map(item => ({
          id: item.customers.id,
          name: item.customers.name,
          phone: item.customers.phone,
          whatsapp: item.customers.whatsapp,
          email: item.customers.email
        }));

      console.log('أعضاء المجموعة المحولة:', members);
      setGroupMembers(members);
    } catch (error) {
      console.error('Error fetching group members:', error);
      toast.error('حدث خطأ في جلب أعضاء المجموعة');
      setGroupMembers([]);
    }
  };

  const handleCreateGroup = async () => {
    if (!formData.name.trim()) {
      toast.error('يرجى إدخال اسم المجموعة');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_groups')
        .insert({
          name: formData.name,
          description: formData.description,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // إضافة أعضاء المجموعة
      if (selectedCustomers.length > 0) {
        const memberInserts = selectedCustomers.map(customerId => ({
          group_id: data.id,
          customer_id: customerId
        }));

        const { error: membersError } = await supabase
          .from('customer_group_members')
          .insert(memberInserts);

        if (membersError) {
          console.error('Error adding group members:', membersError);
          // لا نوقف العملية، فقط نسجل الخطأ
        }
      }
      
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
      const { error } = await supabase
        .from('customer_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      
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

  const handleEditGroup = async (group: CustomerGroup) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || ""
    });
    
    // جلب أعضاء المجموعة الحاليين
    try {
      const { data, error } = await supabase
        .from('customer_group_members')
        .select('customer_id')
        .eq('group_id', group.id);

      if (error) throw error;
      
      const memberIds = (data || []).map(item => item.customer_id);
      setSelectedCustomers(memberIds);
      setShowEditDialog(true);
    } catch (error) {
      console.error('Error fetching group members:', error);
      toast.error('حدث خطأ في جلب أعضاء المجموعة');
    }
  };

  const handleUpdateGroup = async () => {
    if (!selectedGroup || !formData.name.trim()) {
      toast.error('يرجى إدخال اسم المجموعة');
      return;
    }

    setLoading(true);
    try {
      // تحديث بيانات المجموعة
      const { error: updateError } = await supabase
        .from('customer_groups')
        .update({
          name: formData.name,
          description: formData.description
        })
        .eq('id', selectedGroup.id);

      if (updateError) throw updateError;

      // حذف جميع الأعضاء القدامى
      const { error: deleteError } = await supabase
        .from('customer_group_members')
        .delete()
        .eq('group_id', selectedGroup.id);

      if (deleteError) throw deleteError;

      // إضافة الأعضاء الجدد
      if (selectedCustomers.length > 0) {
        const memberInserts = selectedCustomers.map(customerId => ({
          group_id: selectedGroup.id,
          customer_id: customerId
        }));

        const { error: membersError } = await supabase
          .from('customer_group_members')
          .insert(memberInserts);

        if (membersError) throw membersError;
      }
      
      toast.success('تم تحديث المجموعة بنجاح');
      setShowEditDialog(false);
      resetForm();
      fetchGroups();
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error('حدث خطأ في تحديث المجموعة');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: ""
    });
    setSelectedCustomers([]);
    setCustomerSearchTerm("");
    setEditCustomerSearchTerm("");
    setSelectedGroup(null);
  };

  const handleCustomerToggle = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const filteredCustomersForGroup = customers.filter(customer => {
    const searchLower = customerSearchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower) ||
      customer.whatsapp?.toLowerCase().includes(searchLower)
    );
  });

  const filteredCustomersForEdit = customers.filter(customer => {
    const searchLower = editCustomerSearchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower) ||
      customer.whatsapp?.toLowerCase().includes(searchLower)
    );
  });

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
                <Label>العملاء ({selectedCustomers.length} محدد)</Label>
                <Input
                  placeholder="بحث بالاسم أو رقم الجوال..."
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  className="mb-2"
                />
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="space-y-2">
                    {filteredCustomersForGroup.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        لا توجد نتائج للبحث
                      </p>
                    ) : (
                      filteredCustomersForGroup.map((customer) => (
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
                              {customer.whatsapp || customer.phone}
                            </span>
                          </div>
                        </Label>
                      </div>
                      ))
                    )}
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
                <CardTitle className="text-lg">{group.name}</CardTitle>
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
                    onClick={() => handleEditGroup(group)}
                  >
                    <Edit className="h-4 w-4" />
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

      {/* Dialog تعديل المجموعة */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل المجموعة</DialogTitle>
            <DialogDescription>
              تعديل بيانات المجموعة والعملاء المنتمين لها
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">اسم المجموعة *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="أدخل اسم المجموعة"
              />
            </div>

            <div>
              <Label htmlFor="edit-description">الوصف</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="أدخل وصف المجموعة"
                rows={3}
              />
            </div>

            <div>
              <Label>العملاء ({selectedCustomers.length} محدد)</Label>
              <Input
                placeholder="بحث بالاسم أو رقم الجوال..."
                value={editCustomerSearchTerm}
                onChange={(e) => setEditCustomerSearchTerm(e.target.value)}
                className="mb-2"
              />
              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  {filteredCustomersForEdit.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      لا توجد نتائج للبحث
                    </p>
                  ) : (
                    filteredCustomersForEdit.map((customer) => (
                      <div key={customer.id} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id={`edit-${customer.id}`}
                          checked={selectedCustomers.includes(customer.id)}
                          onCheckedChange={() => handleCustomerToggle(customer.id)}
                        />
                        <Label htmlFor={`edit-${customer.id}`} className="flex-1 cursor-pointer">
                          <div className="flex justify-between">
                            <span>{customer.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {customer.whatsapp || customer.phone}
                            </span>
                          </div>
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowEditDialog(false);
                resetForm();
              }}>
                إلغاء
              </Button>
              <Button onClick={handleUpdateGroup} disabled={loading}>
                {loading ? "جاري الحفظ..." : "حفظ التعديلات"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                    <TableCell>{member.whatsapp || '-'}</TableCell>
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