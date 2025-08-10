import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAgency, Agency, AgencyMember } from '@/hooks/useAgency';
import { useToast } from '@/hooks/use-toast';
import { Building2, Users, Settings, Plus, Edit, Trash2, Crown, Shield, User } from 'lucide-react';

const AgencyManagement = () => {
  const { currentAgency, updateAgency, addMember, removeMember, getAgencyMembers } = useAgency();
  const { toast } = useToast();
  const [members, setMembers] = useState<AgencyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);

  // بيانات تحديث الوكالة
  const [agencyForm, setAgencyForm] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    website: '',
    primary_color: '#3b82f6',
    secondary_color: '#64748b'
  });

  // بيانات إضافة عضو جديد
  const [memberForm, setMemberForm] = useState({
    email: '',
    role: 'employee'
  });

  useEffect(() => {
    if (currentAgency) {
      setAgencyForm({
        name: currentAgency.name || '',
        contact_email: currentAgency.contact_email || '',
        contact_phone: currentAgency.contact_phone || '',
        address: currentAgency.address || '',
        website: currentAgency.website || '',
        primary_color: currentAgency.primary_color || '#3b82f6',
        secondary_color: currentAgency.secondary_color || '#64748b'
      });
      fetchMembers();
    }
  }, [currentAgency]);

  const fetchMembers = async () => {
    if (!currentAgency) return;
    
    try {
      const membersData = await getAgencyMembers(currentAgency.id);
      setMembers(membersData as AgencyMember[]);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleUpdateAgency = async () => {
    if (!currentAgency) return;

    setLoading(true);
    try {
      await updateAgency(currentAgency.id, agencyForm);
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث بيانات الوكالة بنجاح"
      });
      setEditDialogOpen(false);
    } catch (error) {
      toast({
        title: "خطأ في التحديث",
        description: "حدث خطأ أثناء تحديث الوكالة",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!currentAgency || !memberForm.email.trim()) return;

    setLoading(true);
    try {
      await addMember(currentAgency.id, memberForm.email.trim(), memberForm.role);
      
      toast({
        title: "تم إضافة العضو بنجاح",
        description: `تم إضافة ${memberForm.email} إلى الوكالة كـ ${getRoleLabel(memberForm.role)}`
      });
      
      // إعادة تحميل قائمة الأعضاء
      await fetchMembers();
      
      // إعادة تعيين النموذج
      setMemberForm({ email: '', role: 'employee' });
      setMemberDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "خطأ في الإضافة",
        description: error.message || "حدث خطأ أثناء إضافة العضو",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!currentAgency) return;

    if (window.confirm(`هل أنت متأكد من إزالة ${memberEmail} من الوكالة؟`)) {
      try {
        await removeMember(memberId);
        toast({
          title: "تم إزالة العضو",
          description: `تم إزالة ${memberEmail} من الوكالة بنجاح`
        });
        // إعادة تحميل قائمة الأعضاء
        await fetchMembers();
      } catch (error) {
        toast({
          title: "خطأ في الإزالة",
          description: "حدث خطأ أثناء إزالة العضو",
          variant: "destructive"
        });
      }
    }
  };
  
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'مالك';
      case 'admin':
        return 'مدير';
      case 'manager':
        return 'مدير عام';
      case 'employee':
        return 'موظف';
      default:
        return 'عضو';
    }
  };

  if (!currentAgency) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لم يتم العثور على وكالة</h3>
              <p className="text-muted-foreground">
                يبدو أنك لست عضواً في أي وكالة حالياً
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة الوكالة</h1>
          <p className="text-muted-foreground">
            إدارة إعدادات وأعضاء الوكالة
          </p>
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            معلومات الوكالة
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            الأعضاء
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            الإعدادات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {currentAgency.name}
                </CardTitle>
                <CardDescription>
                  معلومات الوكالة الأساسية
                </CardDescription>
              </div>
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    تحديث
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>تحديث بيانات الوكالة</DialogTitle>
                    <DialogDescription>
                      قم بتحديث المعلومات الأساسية للوكالة
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">اسم الوكالة</Label>
                      <Input
                        id="name"
                        value={agencyForm.name}
                        onChange={(e) => setAgencyForm(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="contact_email">البريد الإلكتروني</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={agencyForm.contact_email}
                        onChange={(e) => setAgencyForm(prev => ({ ...prev, contact_email: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="contact_phone">رقم الهاتف</Label>
                      <Input
                        id="contact_phone"
                        value={agencyForm.contact_phone}
                        onChange={(e) => setAgencyForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="website">الموقع الإلكتروني</Label>
                      <Input
                        id="website"
                        value={agencyForm.website}
                        onChange={(e) => setAgencyForm(prev => ({ ...prev, website: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="address">العنوان</Label>
                      <Textarea
                        id="address"
                        value={agencyForm.address}
                        onChange={(e) => setAgencyForm(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button onClick={handleUpdateAgency} disabled={loading}>
                      {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    البريد الإلكتروني
                  </Label>
                  <p className="text-sm">{currentAgency.contact_email || 'غير محدد'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    رقم الهاتف
                  </Label>
                  <p className="text-sm">{currentAgency.contact_phone || 'غير محدد'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    الموقع الإلكتروني
                  </Label>
                  <p className="text-sm">{currentAgency.website || 'غير محدد'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    خطة الاشتراك
                  </Label>
                  <Badge variant="secondary">{currentAgency.subscription_plan}</Badge>
                </div>
              </div>
              {currentAgency.address && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    العنوان
                  </Label>
                  <p className="text-sm">{currentAgency.address}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  أعضاء الوكالة
                </CardTitle>
                <CardDescription>
                  إدارة أعضاء الوكالة وصلاحياتهم
                </CardDescription>
              </div>
              <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    إضافة عضو
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>إضافة عضو جديد</DialogTitle>
                    <DialogDescription>
                      ادخل بريد العضو الإلكتروني وحدد دوره في الوكالة
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">البريد الإلكتروني</Label>
                      <Input
                        id="email"
                        type="email"
                        value={memberForm.email}
                        onChange={(e) => setMemberForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="user@example.com"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        يجب أن يكون المستخدم مسجلاً في النظام مسبقاً
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="role">الدور</Label>
                      <Select
                        value={memberForm.role}
                        onValueChange={(value) => setMemberForm(prev => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">مدير</SelectItem>
                          <SelectItem value="manager">مدير عام</SelectItem>
                          <SelectItem value="employee">موظف</SelectItem>
                          <SelectItem value="member">عضو</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setMemberDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button onClick={handleAddMember} disabled={loading || !memberForm.email.trim()}>
                      {loading ? 'جاري الإضافة...' : 'إضافة العضو'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getRoleIcon(member.role)}
                      <div>
                        <p className="font-medium">{(member as any).customers?.name || 'مستخدم'}</p>
                        <p className="text-sm text-muted-foreground">
                          {(member as any).customers?.email || 'بدون بريد إلكتروني'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {getRoleLabel(member.role)}
                      </Badge>
                      {member.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id, (member as any).customers?.email || 'مستخدم')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                إعدادات متقدمة
              </CardTitle>
              <CardDescription>
                إعدادات الوكالة المتقدمة والحدود
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <Label className="text-sm font-medium text-muted-foreground">
                    عدد المستخدمين الأقصى
                  </Label>
                  <p className="text-2xl font-bold">{currentAgency.max_users}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <Label className="text-sm font-medium text-muted-foreground">
                    عدد العملاء الأقصى
                  </Label>
                  <p className="text-2xl font-bold">{currentAgency.max_customers}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <Label className="text-sm font-medium text-muted-foreground">
                    مساحة التخزين (جيجابايت)
                  </Label>
                  <p className="text-2xl font-bold">{currentAgency.max_storage_gb}</p>
                </div>
              </div>
              
              {currentAgency.subscription_expires_at && (
                <div className="p-4 border rounded-lg">
                  <Label className="text-sm font-medium text-muted-foreground">
                    تاريخ انتهاء الاشتراك
                  </Label>
                  <p className="text-lg">
                    {new Date(currentAgency.subscription_expires_at).toLocaleDateString('ar-SA')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AgencyManagement;