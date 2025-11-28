import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Copy, Eye, EyeOff, Download, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export default function APIManagement() {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyNotes, setNewKeyNotes] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const fetchApiKeys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error: any) {
      toast({
        title: 'خطأ في جلب المفاتيح',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'sk_';
    for (let i = 0; i < 48; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: 'خطأ',
        description: 'يجب إدخال اسم للمفتاح',
        variant: 'destructive',
      });
      return;
    }

    try {
      const apiKey = generateApiKey();
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase.from('api_keys').insert({
        key_name: newKeyName,
        api_key: apiKey,
        notes: newKeyNotes,
        created_by: userData.user?.id,
      });

      if (error) throw error;

      toast({
        title: 'تم إنشاء المفتاح بنجاح',
        description: 'تم إنشاء مفتاح API جديد',
      });

      setShowCreateDialog(false);
      setNewKeyName('');
      setNewKeyNotes('');
      fetchApiKeys();
    } catch (error: any) {
      toast({
        title: 'خطأ في إنشاء المفتاح',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId],
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'تم النسخ',
      description: 'تم نسخ المفتاح إلى الحافظة',
    });
  };

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المفتاح؟')) return;

    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);

      if (error) throw error;

      toast({
        title: 'تم الحذف',
        description: 'تم حذف المفتاح بنجاح',
      });

      fetchApiKeys();
    } catch (error: any) {
      toast({
        title: 'خطأ في الحذف',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const downloadPostmanCollection = () => {
    fetch('/API_Documentation.json')
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'API_Documentation.json';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast({
          title: 'تم التنزيل',
          description: 'تم تنزيل ملف Postman Collection',
        });
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">إدارة API</h1>
          <p className="text-muted-foreground">
            إدارة مفاتيح API للتكامل مع الأنظمة الخارجية
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadPostmanCollection} variant="outline">
            <Download className="ml-2 h-4 w-4" />
            تنزيل Postman Collection
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="ml-2 h-4 w-4" />
            مفتاح جديد
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>الطلبات API</CardTitle>
            <CardDescription>عدد الطلبات الكلي</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">متاح قريباً</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>المفاتيح النشطة</CardTitle>
            <CardDescription>عدد المفاتيح الفعالة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {apiKeys.filter(k => k.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>آخر استخدام</CardTitle>
            <CardDescription>آخر طلب API</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">لا توجد طلبات</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>مفاتيح API</CardTitle>
          <CardDescription>
            قائمة جميع مفاتيح API المنشأة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم المفتاح</TableHead>
                <TableHead>المفتاح</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>آخر استخدام</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : apiKeys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    لا توجد مفاتيح API
                  </TableCell>
                </TableRow>
              ) : (
                apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.key_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm">
                          {visibleKeys[key.id]
                            ? key.api_key
                            : `${key.api_key.substring(0, 10)}...${key.api_key.substring(key.api_key.length - 4)}`}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleKeyVisibility(key.id)}
                        >
                          {visibleKeys[key.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(key.api_key)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={key.is_active ? 'default' : 'secondary'}>
                        {key.is_active ? 'نشط' : 'معطل'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {key.last_used_at
                        ? format(new Date(key.last_used_at), 'PPp', { locale: ar })
                        : 'لم يستخدم بعد'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(key.created_at), 'PPp', { locale: ar })}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteApiKey(key.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>روابط API</CardTitle>
          <CardDescription>نقاط الوصول المتاحة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">إدارة الطلبات</p>
                <code className="text-sm text-muted-foreground">
                  https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/api-orders
                </code>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open('https://supabase.com/dashboard/project/pqrzkfpowjutylegdcxj/functions/api-orders/logs', '_blank')}
              >
                <ExternalLink className="ml-2 h-4 w-4" />
                السجلات
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">إدارة العملاء</p>
                <code className="text-sm text-muted-foreground">
                  https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/api-customers
                </code>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open('https://supabase.com/dashboard/project/pqrzkfpowjutylegdcxj/functions/api-customers/logs', '_blank')}
              >
                <ExternalLink className="ml-2 h-4 w-4" />
                السجلات
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">إدارة المدفوعات</p>
                <code className="text-sm text-muted-foreground">
                  https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/api-payments
                </code>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open('https://supabase.com/dashboard/project/pqrzkfpowjutylegdcxj/functions/api-payments/logs', '_blank')}
              >
                <ExternalLink className="ml-2 h-4 w-4" />
                السجلات
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">التقارير والإحصائيات</p>
                <code className="text-sm text-muted-foreground">
                  https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/api-reports
                </code>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open('https://supabase.com/dashboard/project/pqrzkfpowjutylegdcxj/functions/api-reports/logs', '_blank')}
              >
                <ExternalLink className="ml-2 h-4 w-4" />
                السجلات
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إنشاء مفتاح API جديد</DialogTitle>
            <DialogDescription>
              قم بإنشاء مفتاح جديد للتكامل مع الأنظمة الخارجية
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="keyName">اسم المفتاح</Label>
              <Input
                id="keyName"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="مثال: نظام ERP"
              />
            </div>
            <div>
              <Label htmlFor="keyNotes">ملاحظات (اختياري)</Label>
              <Textarea
                id="keyNotes"
                value={newKeyNotes}
                onChange={(e) => setNewKeyNotes(e.target.value)}
                placeholder="وصف استخدام المفتاح"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={createApiKey}>إنشاء المفتاح</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
