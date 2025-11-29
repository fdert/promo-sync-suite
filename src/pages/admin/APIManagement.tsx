import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Copy, Eye, EyeOff, Download, ExternalLink, Webhook, TestTube } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

export default function APIManagement() {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyNotes, setNewKeyNotes] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const { toast } = useToast();

  const orderStatuses = [
    "جديد", "مؤكد", "قيد التنفيذ", "قيد المراجعة",
    "جاهز للتسليم", "مكتمل", "ملغي", "مؤجل", "قيد الانتظار"
  ];

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

  const fetchWebhooks = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_settings')
        .select('*')
        .eq('webhook_type', 'order_status_change')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhooks(data || []);
    } catch (error: any) {
      toast({
        title: 'خطأ في جلب Webhooks',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchApiKeys();
    fetchWebhooks();
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

  const createWebhook = async () => {
    if (!webhookName.trim() || !webhookUrl.trim()) {
      toast({
        title: 'خطأ',
        description: 'يجب إدخال اسم و URL للـ Webhook',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase.from('webhook_settings').insert({
        webhook_name: webhookName,
        webhook_url: webhookUrl,
        webhook_type: 'order_status_change',
        secret_key: webhookSecret || null,
        order_statuses: selectedStatuses.length > 0 ? selectedStatuses : null,
        is_active: true,
        created_by: userData.user?.id,
      });

      if (error) throw error;

      toast({
        title: 'تم إضافة Webhook',
        description: 'تم إضافة الـ Webhook بنجاح',
      });

      setWebhookName('');
      setWebhookUrl('');
      setWebhookSecret('');
      setSelectedStatuses([]);
      fetchWebhooks();
    } catch (error: any) {
      toast({
        title: 'خطأ في إضافة Webhook',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الـ Webhook؟')) return;

    try {
      const { error } = await supabase
        .from('webhook_settings')
        .delete()
        .eq('id', webhookId);

      if (error) throw error;

      toast({
        title: 'تم الحذف',
        description: 'تم حذف الـ Webhook بنجاح',
      });

      fetchWebhooks();
    } catch (error: any) {
      toast({
        title: 'خطأ في الحذف',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const testWebhook = async (webhook: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('webhook-test', {
        body: {
          webhook_url: webhook.webhook_url,
          event: 'order.status_changed',
          test_data: {
            order_id: 'test-order-id',
            order_number: 'ORD-20250101-00001',
            old_status: 'جديد',
            new_status: 'مؤكد',
            customer_id: 'test-customer-id',
            customer_name: 'عميل تجريبي',
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'تم الاختبار بنجاح',
          description: data?.message || 'تم إرسال بيانات تجريبية إلى الـ Webhook',
        });
      } else {
        toast({
          title: 'فشل الاختبار',
          description: data?.error || data?.details || 'حدث خطأ أثناء الاختبار',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'فشل الاختبار',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
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
            إدارة مفاتيح API و Webhooks للتكامل مع الأنظمة الخارجية
          </p>
        </div>
        <Button onClick={downloadPostmanCollection} variant="outline">
          <Download className="ml-2 h-4 w-4" />
          تنزيل Postman Collection
        </Button>
      </div>

      <Tabs defaultValue="api-keys" dir="rtl">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="api-keys">مفاتيح API</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks للطلبات</TabsTrigger>
          <TabsTrigger value="documentation">التوثيق</TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-6">
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>مفاتيح API</CardTitle>
                  <CardDescription>
                    قائمة جميع مفاتيح API المنشأة
                  </CardDescription>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="ml-2 h-4 w-4" />
                  مفتاح جديد
                </Button>
              </div>
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
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                إضافة Webhook جديد
              </CardTitle>
              <CardDescription>
                قم بإضافة webhook لتلقي إشعارات فورية عند تغيير حالة الطلبات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="webhook-name">اسم الـ Webhook</Label>
                  <Input
                    id="webhook-name"
                    placeholder="مثال: نظام المتابعة الخارجي"
                    value={webhookName}
                    onChange={(e) => setWebhookName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="webhook-url">رابط الـ Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    type="url"
                    placeholder="https://your-domain.com/webhook/orders"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="webhook-secret">مفتاح السرية (اختياري)</Label>
                  <Input
                    id="webhook-secret"
                    type="password"
                    placeholder="سيتم إرساله في header X-Webhook-Secret"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="mb-3 block">
                    الحالات المراد متابعتها (اختياري - اتركها فارغة لمتابعة جميع التغييرات)
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    {orderStatuses.map((status) => (
                      <div key={status} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id={`status-${status}`}
                          checked={selectedStatuses.includes(status)}
                          onCheckedChange={() => handleStatusToggle(status)}
                        />
                        <label
                          htmlFor={`status-${status}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {status}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={createWebhook}
                  disabled={!webhookName || !webhookUrl}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة Webhook
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhooks المفعلة</CardTitle>
              <CardDescription>
                قائمة بجميع الـ webhooks المفعلة لتتبع تغييرات حالة الطلبات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {webhooks.length > 0 ? (
                  webhooks.map((webhook) => {
                    const payload = {
                      event: "order.status_changed",
                      timestamp: new Date().toISOString(),
                      data: {
                        order_id: "test-order-id",
                        order_number: "ORD-20250101-00001",
                        old_status: "جديد",
                        new_status: "مؤكد",
                        customer_id: "test-customer-id",
                        customer_name: "عميل تجريبي"
                      }
                    };

                    const curlCommand = `curl -X POST '${webhook.webhook_url}' \\
  -H 'Content-Type: application/json'${webhook.secret_key ? ` \\\n  -H 'X-Webhook-Secret: ${webhook.secret_key}'` : ''} \\
  -d '${JSON.stringify(payload)}'`;

                    return (
                      <div
                        key={webhook.id}
                        className="p-4 border rounded-lg space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{webhook.webhook_name}</h4>
                              {webhook.is_active && (
                                <Badge variant="default">مفعّل</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {webhook.webhook_url}
                            </p>
                            {webhook.order_statuses && webhook.order_statuses.length > 0 ? (
                              <div className="flex gap-1 flex-wrap">
                                <span className="text-xs text-muted-foreground ml-2">الحالات المتابعة:</span>
                                {webhook.order_statuses.map((status: string) => (
                                  <Badge key={status} variant="outline" className="text-xs">
                                    {status}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                يتابع جميع تغييرات الحالات
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => testWebhook(webhook)}
                            >
                              <TestTube className="h-4 w-4 ml-1" />
                              اختبار
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteWebhook(webhook.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="bg-muted rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold">أمر cURL للاختبار:</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(curlCommand)}
                            >
                              <Copy className="h-4 w-4 ml-1" />
                              نسخ
                            </Button>
                          </div>
                          <pre className="text-xs overflow-x-auto bg-background p-3 rounded">
                            {curlCommand}
                          </pre>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    لا توجد webhooks مضافة بعد
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>هيكل البيانات المرسلة</CardTitle>
              <CardDescription>
                عند تغيير حالة أي طلب، سيتم إرسال البيانات التالية إلى webhook الخاص بك
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "event": "order.status_changed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "order_id": "uuid",
    "order_number": "ORD-20240115-00001",
    "old_status": "جديد",
    "new_status": "مؤكد",
    "customer_id": "uuid",
    "customer_name": "اسم العميل",
    "customer_phone": "0501234567",
    "total_amount": 1500.00,
    "delivery_date": "2024-01-20",
    "notes": "ملاحظات الطلب"
  }
}`}
              </pre>
              <div className="mt-4 space-y-2 text-sm">
                <p className="font-semibold">ملاحظات مهمة:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>سيتم إرسال POST request إلى الـ URL المحدد</li>
                  <li>إذا قمت بتحديد مفتاح سرية، سيتم إرساله في header باسم X-Webhook-Secret</li>
                  <li>يجب أن يرد الـ endpoint الخاص بك برمز 2xx للنجاح</li>
                  <li>في حالة الفشل، سيتم إعادة المحاولة 3 مرات</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API الطلبات - دليل الاستخدام</CardTitle>
              <CardDescription>كيفية الاستعلام عن الطلبات وحالتها</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">الرابط الأساسي</h4>
                  <code className="text-sm">
                    https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/api-orders
                  </code>
                </div>

                <div className="space-y-4">
                  <div className="border-r-4 border-primary pr-4">
                    <h4 className="font-semibold mb-2">1️⃣ الاستعلام عن جميع الطلبات</h4>
                    <code className="text-sm block bg-muted p-3 rounded mb-2">
                      GET /api-orders
                    </code>
                    <p className="text-sm text-muted-foreground mb-2">معاملات اختيارية:</p>
                    <ul className="text-sm space-y-1 mr-4">
                      <li>• <code>status</code> - تصفية حسب الحالة</li>
                      <li>• <code>customer_id</code> - تصفية حسب العميل</li>
                      <li>• <code>limit</code> - عدد النتائج (افتراضي: 50)</li>
                      <li>• <code>offset</code> - بداية النتائج (للترقيم)</li>
                    </ul>
                    <div className="mt-2 p-2 bg-muted rounded">
                      <p className="text-xs font-semibold mb-1">cURL Command:</p>
                      <pre className="text-xs overflow-x-auto">{`curl -X GET "https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/api-orders?status=مكتمل&limit=20" \\
  -H "x-api-key: YOUR_API_KEY_HERE"`}</pre>
                    </div>
                  </div>

                  <div className="border-r-4 border-secondary pr-4">
                    <h4 className="font-semibold mb-2">2️⃣ الاستعلام عن طلب محدد</h4>
                    <code className="text-sm block bg-muted p-3 rounded mb-2">
                      GET /api-orders/:id
                    </code>
                    <p className="text-sm text-muted-foreground">
                      يرجع تفاصيل كاملة للطلب بما في ذلك البنود والدفعات
                    </p>
                    <div className="mt-2 p-2 bg-muted rounded">
                      <p className="text-xs font-semibold mb-1">cURL Command:</p>
                      <pre className="text-xs overflow-x-auto">{`curl -X GET "https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/api-orders/123e4567-e89b-12d3-a456-426614174000" \\
  -H "x-api-key: YOUR_API_KEY_HERE"`}</pre>
                    </div>
                  </div>

                  <div className="border-r-4 border-accent pr-4">
                    <h4 className="font-semibold mb-2">3️⃣ إنشاء طلب جديد</h4>
                    <code className="text-sm block bg-muted p-3 rounded mb-2">
                      POST /api-orders
                    </code>
                    <p className="text-sm text-muted-foreground mb-2">البيانات المطلوبة:</p>
                    <div className="mt-2 p-2 bg-muted rounded">
                      <p className="text-xs font-semibold mb-1">cURL Command:</p>
                      <pre className="text-xs overflow-x-auto">{`curl -X POST "https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/api-orders" \\
  -H "x-api-key: YOUR_API_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customer_id": "uuid-here",
    "service_type_id": "uuid-here",
    "items": [
      {
        "item_name": "اسم الصنف",
        "quantity": 1,
        "unit_price": 100
      }
    ],
    "notes": "ملاحظات اختيارية"
  }'`}</pre>
                    </div>
                  </div>

                  <div className="border-r-4 border-muted pr-4">
                    <h4 className="font-semibold mb-2">4️⃣ تحديث حالة الطلب</h4>
                    <code className="text-sm block bg-muted p-3 rounded mb-2">
                      PUT /api-orders/:id
                    </code>
                    <p className="text-sm text-muted-foreground mb-2">الحالات المتاحة:</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge>جديد</Badge>
                      <Badge>مؤكد</Badge>
                      <Badge>قيد التنفيذ</Badge>
                      <Badge>قيد المراجعة</Badge>
                      <Badge>جاهز للتسليم</Badge>
                      <Badge>مكتمل</Badge>
                      <Badge>ملغي</Badge>
                    </div>
                    <div className="mt-2 p-2 bg-muted rounded">
                      <p className="text-xs font-semibold mb-1">cURL Command:</p>
                      <pre className="text-xs overflow-x-auto">{`curl -X PUT "https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/api-orders/ORDER_ID_HERE" \\
  -H "x-api-key: YOUR_API_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "status": "مكتمل"
  }'`}</pre>
                    </div>
                  </div>

                  <div className="border-r-4 border-destructive pr-4">
                    <h4 className="font-semibold mb-2">5️⃣ حذف طلب</h4>
                    <code className="text-sm block bg-muted p-3 rounded mb-2">
                      DELETE /api-orders/:id
                    </code>
                    <p className="text-sm text-muted-foreground">
                      حذف طلب وجميع البيانات المرتبطة به
                    </p>
                    <div className="mt-2 p-2 bg-muted rounded">
                      <p className="text-xs font-semibold mb-1">cURL Command:</p>
                      <pre className="text-xs overflow-x-auto">{`curl -X DELETE "https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/api-orders/ORDER_ID_HERE" \\
  -H "x-api-key: YOUR_API_KEY_HERE"`}</pre>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-primary/10 rounded-lg">
                  <h4 className="font-semibold mb-2">⚠️ مهم: رأس الطلب المطلوب</h4>
                  <p className="text-sm mb-2">يجب إرفاق مفتاح API في رأس جميع الطلبات:</p>
                  <code className="text-sm block bg-background p-2 rounded">
                    x-api-key: sk_your_api_key_here
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>روابط API الأخرى</CardTitle>
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
                  <Button size="sm" variant="ghost" asChild>
                    <a href="https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/api-orders" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">إدارة العملاء</p>
                    <code className="text-sm text-muted-foreground">
                      https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/api-customers
                    </code>
                  </div>
                  <Button size="sm" variant="ghost" asChild>
                    <a href="https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/api-customers" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">المدفوعات</p>
                    <code className="text-sm text-muted-foreground">
                      https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/api-payments
                    </code>
                  </div>
                  <Button size="sm" variant="ghost" asChild>
                    <a href="https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/api-payments" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">التقارير</p>
                    <code className="text-sm text-muted-foreground">
                      https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/api-reports
                    </code>
                  </div>
                  <Button size="sm" variant="ghost" asChild>
                    <a href="https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/api-reports" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إنشاء مفتاح API جديد</DialogTitle>
            <DialogDescription>
              أنشئ مفتاح API جديد للتكامل مع الأنظمة الخارجية
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="key-name">اسم المفتاح</Label>
              <Input
                id="key-name"
                placeholder="مثال: نظام التكامل الرئيسي"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="key-notes">ملاحظات (اختياري)</Label>
              <Textarea
                id="key-notes"
                placeholder="ملاحظات أو وصف للمفتاح"
                value={newKeyNotes}
                onChange={(e) => setNewKeyNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={createApiKey}>
              إنشاء المفتاح
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
