import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, UserPlus, Shield, Users, Eye, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UserRole = 'admin' | 'manager' | 'employee' | 'accountant' | 'user' | 'super_admin';

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  user_metadata: {
    full_name?: string;
  };
  roles?: UserRole[];
  agencies?: string[];
}

const SystemUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole | "">("");
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // جلب المستخدمين مع أدوارهم
      const { data: usersData, error: usersError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          users:user_id (
            id,
            email,
            created_at,
            last_sign_in_at,
            user_metadata
          )
        `);

      if (usersError) {
        console.error('Error fetching users:', usersError);
        toast({
          title: "خطأ",
          description: "حدث خطأ في جلب بيانات المستخدمين",
          variant: "destructive",
        });
        return;
      }

      // تجميع البيانات
      const userMap = new Map<string, User>();
      
      usersData?.forEach((item: any) => {
        const user = item.users;
        if (user) {
          if (!userMap.has(user.id)) {
            userMap.set(user.id, {
              ...user,
              roles: [],
              agencies: []
            });
          }
          userMap.get(user.id)?.roles?.push(item.role);
        }
      });

      setUsers(Array.from(userMap.values()));
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async (userId: string, role: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) {
        toast({
          title: "خطأ",
          description: "حدث خطأ في تعيين الدور",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "تم بنجاح",
        description: "تم تعيين الدور بنجاح",
      });

      fetchUsers();
    } catch (error) {
      console.error('Error assigning role:', error);
    }
  };

  const removeRole = async (userId: string, role: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) {
        toast({
          title: "خطأ",
          description: "حدث خطأ في إزالة الدور",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "تم بنجاح",
        description: "تم إزالة الدور بنجاح",
      });

      fetchUsers();
    } catch (error) {
      console.error('Error removing role:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_metadata?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'manager':
        return 'secondary';
      case 'employee':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'مدير النظام';
      case 'admin':
        return 'مدير';
      case 'manager':
        return 'مدير فرعي';
      case 'employee':
        return 'موظف';
      case 'user':
        return 'مستخدم';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة المستخدمين</h1>
          <p className="text-muted-foreground">
            إدارة جميع مستخدمي النظام وأدوارهم
          </p>
        </div>
        <Badge variant="secondary">
          <Users className="h-4 w-4 mr-2" />
          {users.length} مستخدم
        </Badge>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مدراء النظام</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.roles?.includes('super_admin')).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المدراء</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.roles?.includes('admin')).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الموظفون</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.roles?.includes('employee')).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* البحث والفلاتر */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المستخدمين</CardTitle>
          <CardDescription>
            البحث وإدارة جميع مستخدمي النظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث بالبريد الإلكتروني أو الاسم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>الأدوار</TableHead>
                  <TableHead>تاريخ التسجيل</TableHead>
                  <TableHead>آخر دخول</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.email}</div>
                        {user.user_metadata?.full_name && (
                          <div className="text-sm text-muted-foreground">
                            {user.user_metadata.full_name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles?.map((role) => (
                          <Badge
                            key={role}
                            variant={getRoleBadgeVariant(role)}
                            className="text-xs"
                          >
                            {getRoleLabel(role)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell>
                      {user.last_sign_in_at 
                        ? new Date(user.last_sign_in_at).toLocaleDateString('ar-SA')
                        : 'لم يسجل دخول'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>إدارة أدوار المستخدم</DialogTitle>
                              <DialogDescription>
                                تعديل أدوار المستخدم: {user.email}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-sm font-medium mb-2">الأدوار الحالية:</h4>
                                <div className="flex flex-wrap gap-2">
                                  {user.roles?.map((role) => (
                                    <div key={role} className="flex items-center gap-2">
                                      <Badge variant={getRoleBadgeVariant(role)}>
                                        {getRoleLabel(role)}
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeRole(user.id, role)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="text-sm font-medium mb-2">إضافة دور جديد:</h4>
                                <div className="flex gap-2">
                                  <Select value={newRole} onValueChange={(value) => setNewRole(value as UserRole | "")}>
                                    <SelectTrigger className="flex-1">
                                      <SelectValue placeholder="اختر دور..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="super_admin">مدير النظام</SelectItem>
                                      <SelectItem value="admin">مدير</SelectItem>
                                      <SelectItem value="manager">مدير فرعي</SelectItem>
                                      <SelectItem value="employee">موظف</SelectItem>
                                      <SelectItem value="user">مستخدم</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    onClick={() => {
                                      if (newRole) {
                                        assignRole(user.id, newRole);
                                        setNewRole("");
                                      }
                                    }}
                                    disabled={!newRole}
                                  >
                                    <UserPlus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد مستخدمين مطابقين للبحث</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemUsers;