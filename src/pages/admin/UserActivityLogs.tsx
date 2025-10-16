// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  CalendarDays,
  Search,
  Filter,
  User,
  Activity,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
  profiles?: {
    full_name?: string;
  } | null;
}

interface User {
  id: string;
  full_name: string;
}

const UserActivityLogs = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { toast } = useToast();

  // جلب المستخدمين
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب المستخدمين",
        variant: "destructive",
      });
    }
  };

  // جلب سجلات النشاط
  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('user_activity_logs')
        .select(`
          *,
          profiles(full_name)
        `)
        .order('created_at', { ascending: false });

      // تطبيق الفلاتر
      if (selectedUserId && selectedUserId !== "all") {
        query = query.eq('user_id', selectedUserId);
      }

      if (startDate) {
        query = query.gte('created_at', startDate + 'T00:00:00');
      }

      if (endDate) {
        query = query.lte('created_at', endDate + 'T23:59:59');
      }

      if (actionFilter && actionFilter !== "all") {
        query = query.eq('action', actionFilter);
      }

      if (resourceFilter && resourceFilter !== "all") {
        query = query.eq('resource_type', resourceFilter);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب سجلات النشاط",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // تصفية السجلات حسب النص
  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.resource_type.toLowerCase().includes(searchLower) ||
      (log.details && JSON.stringify(log.details).toLowerCase().includes(searchLower))
    );
  });

  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ar });
    } catch {
      return dateString;
    }
  };

  // تنسيق تفاصيل العملية
  const formatDetails = (details: any) => {
    if (!details) return '-';
    
    if (typeof details === 'string') return details;
    
    try {
      return JSON.stringify(details, null, 2);
    } catch {
      return '-';
    }
  };

  // الحصول على لون النشاط
  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'insert':
        return 'bg-green-100 text-green-800';
      case 'update':
      case 'edit':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
      case 'remove':
        return 'bg-red-100 text-red-800';
      case 'login':
        return 'bg-purple-100 text-purple-800';
      case 'logout':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  // تطبيق الفلاتر السريعة
  const applyQuickFilter = (period: string) => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    
    switch (period) {
      case 'today':
        setStartDate(today);
        setEndDate(today);
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        setStartDate(format(weekAgo, 'yyyy-MM-dd'));
        setEndDate(today);
        break;
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        setStartDate(format(monthAgo, 'yyyy-MM-dd'));
        setEndDate(today);
        break;
      case 'year':
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        setStartDate(format(yearAgo, 'yyyy-MM-dd'));
        setEndDate(today);
        break;
      default:
        setStartDate("");
        setEndDate("");
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchActivityLogs();
  }, []);

  useEffect(() => {
    fetchActivityLogs();
  }, [selectedUserId, startDate, endDate, actionFilter, resourceFilter]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6" />
          <h1 className="text-2xl font-bold">سجلات نشاط المستخدمين</h1>
        </div>
      </div>

      {/* الفلاتر */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            الفلاتر والبحث
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* الفلاتر السريعة */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyQuickFilter('today')}
            >
              اليوم
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyQuickFilter('week')}
            >
              هذا الأسبوع
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyQuickFilter('month')}
            >
              هذا الشهر
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyQuickFilter('year')}
            >
              هذا العام
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyQuickFilter('all')}
            >
              الكل
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* اختيار المستخدم */}
            <div className="space-y-2">
              <Label>المستخدم</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع المستخدمين" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المستخدمين</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || 'بدون اسم'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* نوع العملية */}
            <div className="space-y-2">
              <Label>نوع العملية</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع العمليات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع العمليات</SelectItem>
                  <SelectItem value="create">إنشاء</SelectItem>
                  <SelectItem value="update">تحديث</SelectItem>
                  <SelectItem value="delete">حذف</SelectItem>
                  <SelectItem value="login">تسجيل دخول</SelectItem>
                  <SelectItem value="logout">تسجيل خروج</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* نوع المورد */}
            <div className="space-y-2">
              <Label>نوع المورد</Label>
              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الموارد" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الموارد</SelectItem>
                  <SelectItem value="order">طلب</SelectItem>
                  <SelectItem value="customer">عميل</SelectItem>
                  <SelectItem value="invoice">فاتورة</SelectItem>
                  <SelectItem value="payment">دفعة</SelectItem>
                  <SelectItem value="user">مستخدم</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* البحث */}
            <div className="space-y-2">
              <Label>البحث</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="البحث في السجلات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* فلاتر التاريخ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>من تاريخ</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>إلى تاريخ</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* النتائج */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>سجلات النشاط ({filteredLogs.length})</span>
            <Badge variant="outline">{filteredLogs.length} سجل</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>العملية</TableHead>
                  <TableHead>نوع المورد</TableHead>
                  <TableHead>معرف المورد</TableHead>
                  <TableHead>التفاصيل</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>عنوان IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        {users.find(u => u.id === log.user_id)?.full_name || 'مستخدم غير معروف'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.resource_type}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.resource_id}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={formatDetails(log.details)}>
                        {formatDetails(log.details)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {formatDate(log.created_at)}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.ip_address || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredLogs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                لا توجد سجلات نشاط مطابقة للفلاتر المحددة
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserActivityLogs;