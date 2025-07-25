import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users as UsersIcon, UserPlus, Settings, Shield, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Users = () => {
  const [users, setUsers] = useState([
    {
      id: 1,
      name: "أحمد محمد السعيد",
      email: "ahmed.admin@company.com",
      role: "admin",
      status: "active",
      lastLogin: "منذ 10 دقائق",
      permissions: [
        "orders_view", "orders_create", "orders_edit", "orders_delete",
        "customers_view", "customers_create", "customers_edit", "customers_delete",
        "invoices_view", "invoices_create", "invoices_edit", "invoices_delete",
        "accounts_view", "accounts_create", "accounts_edit", "accounts_delete",
        "reports_view", "reports_create", "reports_export",
        "users_view", "users_create", "users_edit", "users_delete",
        "settings_view", "settings_edit"
      ]
    },
    {
      id: 2,
      name: "سارة أحمد المدير",
      email: "sara.manager@company.com", 
      role: "manager",
      status: "active",
      lastLogin: "منذ ساعة",
      permissions: [
        "orders_view", "orders_create", "orders_edit",
        "customers_view", "customers_create", "customers_edit", 
        "invoices_view", "invoices_create", "invoices_edit",
        "reports_view", "reports_create", "reports_export"
      ]
    },
    {
      id: 3,
      name: "محمد علي المحاسب",
      email: "mohammed.accountant@company.com",
      role: "accountant", 
      status: "active",
      lastLogin: "منذ 30 دقيقة",
      permissions: [
        "invoices_view", "invoices_create", "invoices_edit", "invoices_delete",
        "accounts_view", "accounts_create", "accounts_edit", 
        "reports_view", "reports_export"
      ]
    },
    {
      id: 4,
      name: "فاطمة النجار الموظف",
      email: "fatima.employee@company.com",
      role: "employee",
      status: "active", 
      lastLogin: "منذ يومين",
      permissions: [
        "orders_view", "orders_create",
        "customers_view", "customers_edit",
        "invoices_view"
      ]
    }
  ]);

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    permissions: []
  });

  const { toast } = useToast();

  const roles = [
    { 
      value: "admin", 
      label: "مدير عام", 
      permissions: [
        "orders_view", "orders_create", "orders_edit", "orders_delete",
        "customers_view", "customers_create", "customers_edit", "customers_delete",
        "invoices_view", "invoices_create", "invoices_edit", "invoices_delete",
        "accounts_view", "accounts_create", "accounts_edit", "accounts_delete",
        "reports_view", "reports_create", "reports_export",
        "users_view", "users_create", "users_edit", "users_delete",
        "settings_view", "settings_edit"
      ]
    },
    { 
      value: "manager", 
      label: "مدير قسم", 
      permissions: [
        "orders_view", "orders_create", "orders_edit",
        "customers_view", "customers_create", "customers_edit",
        "invoices_view", "invoices_create", "invoices_edit",
        "reports_view", "reports_create", "reports_export"
      ]
    },
    { 
      value: "employee", 
      label: "موظف", 
      permissions: [
        "orders_view", "orders_create", "orders_edit",
        "customers_view", "customers_create", "customers_edit",
        "invoices_view", "invoices_create"
      ]
    },
    { 
      value: "accountant", 
      label: "محاسب", 
      permissions: [
        "invoices_view", "invoices_create", "invoices_edit", "invoices_delete",
        "accounts_view", "accounts_create", "accounts_edit", "accounts_delete",
        "reports_view", "reports_create", "reports_export"
      ]
    }
  ];

  const allPermissions = [
    { 
      key: "orders", 
      label: "الطلبات",
      actions: [
        { key: "orders_view", label: "عرض الطلبات" },
        { key: "orders_create", label: "إضافة طلب" },
        { key: "orders_edit", label: "تعديل طلب" },
        { key: "orders_delete", label: "حذف طلب" }
      ]
    },
    { 
      key: "customers", 
      label: "العملاء",
      actions: [
        { key: "customers_view", label: "عرض العملاء" },
        { key: "customers_create", label: "إضافة عميل" },
        { key: "customers_edit", label: "تعديل عميل" },
        { key: "customers_delete", label: "حذف عميل" }
      ]
    },
    { 
      key: "invoices", 
      label: "الفواتير",
      actions: [
        { key: "invoices_view", label: "عرض الفواتير" },
        { key: "invoices_create", label: "إنشاء فاتورة" },
        { key: "invoices_edit", label: "تعديل فاتورة" },
        { key: "invoices_delete", label: "حذف فاتورة" }
      ]
    },
    { 
      key: "accounts", 
      label: "الحسابات",
      actions: [
        { key: "accounts_view", label: "عرض الحسابات" },
        { key: "accounts_create", label: "إضافة حساب" },
        { key: "accounts_edit", label: "تعديل حساب" },
        { key: "accounts_delete", label: "حذف حساب" }
      ]
    },
    { 
      key: "reports", 
      label: "التقارير",
      actions: [
        { key: "reports_view", label: "عرض التقارير" },
        { key: "reports_create", label: "إنشاء تقرير" },
        { key: "reports_export", label: "تصدير التقارير" }
      ]
    },
    { 
      key: "users", 
      label: "المستخدمين",
      actions: [
        { key: "users_view", label: "عرض المستخدمين" },
        { key: "users_create", label: "إضافة مستخدم" },
        { key: "users_edit", label: "تعديل مستخدم" },
        { key: "users_delete", label: "حذف مستخدم" }
      ]
    },
    { 
      key: "settings", 
      label: "الإعدادات",
      actions: [
        { key: "settings_view", label: "عرض الإعدادات" },
        { key: "settings_edit", label: "تعديل الإعدادات" }
      ]
    }
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="secondary">مدير عام</Badge>;
      case "manager":
        return <Badge variant="secondary">مدير قسم</Badge>;
      case "employee":
        return <Badge variant="secondary">موظف</Badge>;
      case "accountant":
        return <Badge variant="secondary">محاسب</Badge>;
      default:
        return <Badge>غير محدد</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <Badge variant="default">نشط</Badge>
    ) : (
      <Badge variant="outline">غير نشط</Badge>
    );
  };

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email || !newUser.role) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const userWithId = {
      ...newUser,
      id: users.length + 1,
      status: "active",
      lastLogin: "لم يدخل بعد",
      permissions: newUser.permissions
    };

    setUsers([...users, userWithId]);
    setNewUser({ name: "", email: "", password: "", role: "", permissions: [] });
    setIsAddUserOpen(false);
    
    toast({
      title: "تم إضافة المستخدم",
      description: "تم إضافة المستخدم الجديد بنجاح",
    });
  };

  const togglePermission = (permission: string) => {
    const currentPermissions = newUser.permissions;
    const hasPermission = currentPermissions.includes(permission);
    
    if (hasPermission) {
      setNewUser({
        ...newUser,
        permissions: currentPermissions.filter(p => p !== permission)
      });
    } else {
      setNewUser({
        ...newUser,
        permissions: [...currentPermissions, permission]
      });
    }
  };

  const toggleUserStatus = (userId: number) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === "active" ? "inactive" : "active" }
        : user
    ));
  };

  const deleteUser = (userId: number) => {
    setUsers(users.filter(user => user.id !== userId));
    toast({
      title: "تم حذف المستخدم",
      description: "تم حذف المستخدم بنجاح",
    });
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setNewUser({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      permissions: user.permissions
    });
    setIsEditUserOpen(true);
  };

  const handleUpdateUser = () => {
    if (!newUser.name || !newUser.email || !newUser.role) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const selectedRole = roles.find(r => r.value === newUser.role);
    setUsers(users.map(user => 
      user.id === editingUser?.id 
        ? { 
            ...user, 
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            permissions: newUser.permissions
          }
        : user
    ));
    
    setNewUser({ name: "", email: "", password: "", role: "", permissions: [] });
    setIsEditUserOpen(false);
    setEditingUser(null);
    
    toast({
      title: "تم تحديث المستخدم",
      description: "تم تحديث بيانات المستخدم بنجاح",
    });
  };

  const applyRolePermissions = (roleValue: string) => {
    const selectedRole = roles.find(r => r.value === roleValue);
    if (selectedRole) {
      setNewUser({
        ...newUser,
        role: roleValue,
        permissions: selectedRole.permissions
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة المستخدمين</h1>
          <p className="text-muted-foreground">إدارة المستخدمين وصلاحياتهم</p>
        </div>
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              إضافة مستخدم جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة مستخدم جديد</DialogTitle>
              <DialogDescription>
                أدخل بيانات المستخدم الجديد وحدد صلاحياته
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم الكامل</Label>
                <Input
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="أدخل الاسم الكامل"
                />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="أدخل البريد الإلكتروني"
                />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور</Label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="أدخل كلمة المرور"
                />
              </div>
              <div className="space-y-2">
                <Label>الدور الوظيفي</Label>
                <Select value={newUser.role} onValueChange={applyRolePermissions}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الدور الوظيفي" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4 max-h-60 overflow-y-auto">
                <Label>الصلاحيات المفصلة</Label>
                {allPermissions.map((permissionGroup) => (
                  <div key={permissionGroup.key} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">{permissionGroup.label}</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const allGroupActions = permissionGroup.actions.map(a => a.key);
                            const hasAll = allGroupActions.every(action => newUser.permissions.includes(action));
                            
                            if (hasAll) {
                              // إزالة جميع صلاحيات هذه المجموعة
                              setNewUser({
                                ...newUser,
                                permissions: newUser.permissions.filter(p => !allGroupActions.includes(p))
                              });
                            } else {
                              // إضافة جميع صلاحيات هذه المجموعة
                              const newPermissions = [...newUser.permissions];
                              allGroupActions.forEach(action => {
                                if (!newPermissions.includes(action)) {
                                  newPermissions.push(action);
                                }
                              });
                              setNewUser({
                                ...newUser,
                                permissions: newPermissions
                              });
                            }
                          }}
                        >
                          {permissionGroup.actions.every(action => newUser.permissions.includes(action.key)) ? 'إلغاء الكل' : 'تحديد الكل'}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {permissionGroup.actions.map((action) => (
                        <div key={action.key} className="flex items-center space-x-2 space-x-reverse">
                          <input
                            type="checkbox"
                            id={`perm-${action.key}`}
                            checked={newUser.permissions.includes(action.key)}
                            onChange={() => togglePermission(action.key)}
                            className="rounded border-border"
                          />
                          <Label htmlFor={`perm-${action.key}`} className="text-sm">
                            {action.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  يمكنك اختيار صلاحيات مفصلة لكل قسم أو تطبيق صلاحيات الدور المحدد أعلاه
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddUser} className="flex-1">
                  إضافة المستخدم
                </Button>
                <Button variant="outline" onClick={() => setIsAddUserOpen(false)} className="flex-1">
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
              <DialogDescription>
                تعديل بيانات المستخدم وصلاحياته
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم الكامل</Label>
                <Input
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="أدخل الاسم الكامل"
                />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="أدخل البريد الإلكتروني"
                />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور الجديدة (اختياري)</Label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="اتركها فارغة للاحتفاظ بالحالية"
                />
              </div>
              <div className="space-y-2">
                <Label>الدور الوظيفي</Label>
                <Select value={newUser.role} onValueChange={applyRolePermissions}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الدور الوظيفي" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4 max-h-60 overflow-y-auto">
                <Label>الصلاحيات المفصلة</Label>
                {allPermissions.map((permissionGroup) => (
                  <div key={permissionGroup.key} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">{permissionGroup.label}</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const allGroupActions = permissionGroup.actions.map(a => a.key);
                            const hasAll = allGroupActions.every(action => newUser.permissions.includes(action));
                            
                            if (hasAll) {
                              setNewUser({
                                ...newUser,
                                permissions: newUser.permissions.filter(p => !allGroupActions.includes(p))
                              });
                            } else {
                              const newPermissions = [...newUser.permissions];
                              allGroupActions.forEach(action => {
                                if (!newPermissions.includes(action)) {
                                  newPermissions.push(action);
                                }
                              });
                              setNewUser({
                                ...newUser,
                                permissions: newPermissions
                              });
                            }
                          }}
                        >
                          {permissionGroup.actions.every(action => newUser.permissions.includes(action.key)) ? 'إلغاء الكل' : 'تحديد الكل'}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {permissionGroup.actions.map((action) => (
                        <div key={action.key} className="flex items-center space-x-2 space-x-reverse">
                          <input
                            type="checkbox"
                            id={`edit-perm-${action.key}`}
                            checked={newUser.permissions.includes(action.key)}
                            onChange={() => togglePermission(action.key)}
                            className="rounded border-border"
                          />
                          <Label htmlFor={`edit-perm-${action.key}`} className="text-sm">
                            {action.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  يمكنك تخصيص الصلاحيات بشكل مفصل لكل قسم
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateUser} className="flex-1">
                  تحديث المستخدم
                </Button>
                <Button variant="outline" onClick={() => setIsEditUserOpen(false)} className="flex-1">
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المستخدمين النشطين</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.status === "active").length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المديرين</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.role === "admin" || u.role === "manager").length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الموظفين</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.role === "employee").length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المستخدمين</CardTitle>
          <CardDescription>إدارة المستخدمين وصلاحياتهم</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المستخدم</TableHead>
                <TableHead>الدور</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>آخر دخول</TableHead>
                <TableHead>الصلاحيات</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.lastLogin}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {allPermissions.map((permissionGroup) => {
                        const userGroupPermissions = user.permissions.filter(p => 
                          permissionGroup.actions.some(action => action.key === p)
                        );
                        
                        if (userGroupPermissions.length === 0) return null;
                        
                        return (
                          <Badge key={permissionGroup.key} variant="outline" className="text-xs">
                            {permissionGroup.label} ({userGroupPermissions.length})
                          </Badge>
                        );
                      }).filter(Boolean).slice(0, 3)}
                      
                      {allPermissions.filter(permissionGroup => 
                        user.permissions.some(p => 
                          permissionGroup.actions.some(action => action.key === p)
                        )
                      ).length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{allPermissions.filter(permissionGroup => 
                            user.permissions.some(p => 
                              permissionGroup.actions.some(action => action.key === p)
                            )
                          ).length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Switch
                        checked={user.status === "active"}
                        onCheckedChange={() => toggleUserStatus(user.id)}
                      />
                      <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteUser(user.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

export default Users;