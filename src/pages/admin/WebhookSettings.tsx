import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Webhook, 
  MessageSquare, 
  Send, 
  Settings, 
  TestTube,
  Check,
  X,
  Clock,
  FileText,
  ClipboardList,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const WebhookSettings = () => {
  const [whatsappConfig, setWhatsappConfig] = useState({
    enabled: true,
    apiUrl: "https://api.whatsapp.business/v1/",
    token: "",
    phoneNumberId: "",
    businessAccountId: ""
  });

  const [orderWebhooks, setOrderWebhooks] = useState([
    {
      id: 1,
      stage: "pending",
      label: "طلب جديد",
      url: "",
      enabled: true,
      message: "تم استلام طلب جديد من العميل {customer_name} بقيمة {amount} ريال"
    },
    {
      id: 2,
      stage: "in_progress",
      label: "بدء التنفيذ",
      url: "",
      enabled: true,
      message: "تم بدء تنفيذ الطلب #{order_id} للعميل {customer_name}"
    },
    {
      id: 3,
      stage: "review",
      label: "مراجعة",
      url: "",
      enabled: true,
      message: "الطلب #{order_id} جاهز للمراجعة من العميل {customer_name}"
    },
    {
      id: 4,
      stage: "completed",
      label: "مكتمل",
      url: "",
      enabled: true,
      message: "تم إنجاز الطلب #{order_id} للعميل {customer_name} بنجاح"
    },
    {
      id: 5,
      stage: "cancelled",
      label: "ملغي",
      url: "",
      enabled: false,
      message: "تم إلغاء الطلب #{order_id} للعميل {customer_name}"
    }
  ]);

  const [invoiceWebhooks, setInvoiceWebhooks] = useState([
    {
      id: 1,
      event: "invoice_created",
      label: "إنشاء فاتورة",
      url: "",
      enabled: true,
      message: "تم إنشاء فاتورة جديدة #{invoice_id} للعميل {customer_name} بقيمة {amount} ريال"
    },
    {
      id: 2,
      event: "payment_received",
      label: "استلام دفعة",
      url: "",
      enabled: true,
      message: "تم استلام دفعة بقيمة {amount} ريال للفاتورة #{invoice_id} من العميل {customer_name}"
    },
    {
      id: 3,
      event: "payment_overdue",
      label: "تأخير في الدفع",
      url: "",
      enabled: true,
      message: "تنبيه: تأخر في دفع الفاتورة #{invoice_id} للعميل {customer_name}"
    }
  ]);

  const [webhookLogs, setWebhookLogs] = useState([
    {
      id: 1,
      event: "order_completed",
      url: "https://api.example.com/webhook",
      status: "success",
      response: "200 OK",
      timestamp: "2024-01-15 14:30:22",
      payload: { order_id: 123, customer_name: "شركة الإبداع" }
    },
    {
      id: 2,
      event: "invoice_created", 
      url: "https://api.example.com/webhook",
      status: "failed",
      response: "500 Internal Server Error",
      timestamp: "2024-01-15 14:25:15",
      payload: { invoice_id: 456, customer_name: "مؤسسة النجاح" }
    }
  ]);

  const { toast } = useToast();

  const testWebhook = async (url: string, event: string) => {
    if (!url) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رابط الويب هوك أولاً",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "جاري الاختبار...",
      description: "يتم إرسال طلب اختبار للويب هوك",
    });

    // Simulate webhook test
    setTimeout(() => {
      const newLog = {
        id: webhookLogs.length + 1,
        event: event + "_test",
        url: url,
        status: "success" as const,
        response: "200 OK - Test successful",
        timestamp: new Date().toLocaleString('ar-SA'),
        payload: { order_id: 999, customer_name: "اختبار" }
      };

      setWebhookLogs([newLog, ...webhookLogs]);
      
      toast({
        title: "نجح الاختبار",
        description: "تم إرسال الويب هوك بنجاح",
      });
    }, 2000);
  };

  const saveWhatsAppConfig = () => {
    toast({
      title: "تم حفظ الإعدادات",
      description: "تم حفظ إعدادات واتساب بنجاح",
    });
  };

  const saveOrderWebhooks = () => {
    toast({
      title: "تم حفظ الإعدادات",
      description: "تم حفظ إعدادات ويب هوك الطلبات بنجاح",
    });
  };

  const saveInvoiceWebhooks = () => {
    toast({
      title: "تم حفظ الإعدادات",
      description: "تم حفظ إعدادات ويب هوك الفواتير بنجاح",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800"><Check className="w-3 h-3 mr-1" />نجح</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800"><X className="w-3 h-3 mr-1" />فشل</Badge>;
      case "pending":
        return <Badge className="bg-warning/10 text-warning-foreground"><Clock className="w-3 h-3 mr-1" />معلق</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إعدادات الويب هوك</h1>
          <p className="text-muted-foreground">إدارة الويب هوك للواتساب والطلبات والفواتير</p>
        </div>
      </div>

      <Tabs defaultValue="whatsapp" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            واتساب
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            الطلبات
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="h-4 w-4" />
            الفواتير
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Webhook className="h-4 w-4" />
            السجلات
          </TabsTrigger>
        </TabsList>

        {/* WhatsApp Configuration */}
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                إعدادات واتساب بيزنس
              </CardTitle>
              <CardDescription>
                تكوين API واتساب لإرسال الرسائل التلقائية
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">تفعيل واتساب بيزنس</Label>
                  <p className="text-sm text-muted-foreground">تفعيل إرسال الرسائل عبر واتساب</p>
                </div>
                <Switch 
                  checked={whatsappConfig.enabled} 
                  onCheckedChange={(checked) => setWhatsappConfig({...whatsappConfig, enabled: checked})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>رابط API</Label>
                  <Input
                    value={whatsappConfig.apiUrl}
                    onChange={(e) => setWhatsappConfig({...whatsappConfig, apiUrl: e.target.value})}
                    placeholder="https://api.whatsapp.business/v1/"
                  />
                </div>
                <div className="space-y-2">
                  <Label>رمز الوصول (Access Token)</Label>
                  <Input
                    type="password"
                    value={whatsappConfig.token}
                    onChange={(e) => setWhatsappConfig({...whatsappConfig, token: e.target.value})}
                    placeholder="أدخل رمز الوصول"
                  />
                </div>
                <div className="space-y-2">
                  <Label>معرف رقم الهاتف</Label>
                  <Input
                    value={whatsappConfig.phoneNumberId}
                    onChange={(e) => setWhatsappConfig({...whatsappConfig, phoneNumberId: e.target.value})}
                    placeholder="معرف رقم الهاتف"
                  />
                </div>
                <div className="space-y-2">
                  <Label>معرف الحساب التجاري</Label>
                  <Input
                    value={whatsappConfig.businessAccountId}
                    onChange={(e) => setWhatsappConfig({...whatsappConfig, businessAccountId: e.target.value})}
                    placeholder="معرف الحساب التجاري"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveWhatsAppConfig}>
                  <Settings className="h-4 w-4 mr-2" />
                  حفظ الإعدادات
                </Button>
                <Button variant="outline" onClick={() => testWebhook("", "whatsapp_test")}>
                  <TestTube className="h-4 w-4 mr-2" />
                  اختبار الاتصال
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Order Webhooks */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                ويب هوك مراحل الطلبات
              </CardTitle>
              <CardDescription>
                تكوين الويب هوك لكل مرحلة من مراحل تنفيذ الطلب
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {orderWebhooks.map((webhook) => (
                  <div key={webhook.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{webhook.label}</h4>
                        <p className="text-sm text-muted-foreground">مرحلة: {webhook.stage}</p>
                      </div>
                      <Switch 
                        checked={webhook.enabled}
                        onCheckedChange={(checked) => {
                          setOrderWebhooks(orderWebhooks.map(w => 
                            w.id === webhook.id ? {...w, enabled: checked} : w
                          ));
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>رابط الويب هوك</Label>
                      <div className="flex gap-2">
                        <Input
                          value={webhook.url}
                          onChange={(e) => {
                            setOrderWebhooks(orderWebhooks.map(w => 
                              w.id === webhook.id ? {...w, url: e.target.value} : w
                            ));
                          }}
                          placeholder="https://api.example.com/webhook"
                          className="flex-1"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => testWebhook(webhook.url, webhook.stage)}
                        >
                          <TestTube className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>نص الرسالة</Label>
                      <Textarea
                        value={webhook.message}
                        onChange={(e) => {
                          setOrderWebhooks(orderWebhooks.map(w => 
                            w.id === webhook.id ? {...w, message: e.target.value} : w
                          ));
                        }}
                        placeholder="نص الرسالة التي سترسل"
                        rows={2}
                      />
                      <p className="text-xs text-muted-foreground">
                        المتغيرات المتاحة: {"{customer_name}, {order_id}, {amount}, {service}, {deadline}"}
                      </p>
                    </div>
                  </div>
                ))}
                <Button onClick={saveOrderWebhooks} className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  حفظ إعدادات الطلبات
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoice Webhooks */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                ويب هوك الفواتير
              </CardTitle>
              <CardDescription>
                تكوين الويب هوك لأحداث الفواتير والمدفوعات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {invoiceWebhooks.map((webhook) => (
                  <div key={webhook.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{webhook.label}</h4>
                        <p className="text-sm text-muted-foreground">حدث: {webhook.event}</p>
                      </div>
                      <Switch 
                        checked={webhook.enabled}
                        onCheckedChange={(checked) => {
                          setInvoiceWebhooks(invoiceWebhooks.map(w => 
                            w.id === webhook.id ? {...w, enabled: checked} : w
                          ));
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>رابط الويب هوك</Label>
                      <div className="flex gap-2">
                        <Input
                          value={webhook.url}
                          onChange={(e) => {
                            setInvoiceWebhooks(invoiceWebhooks.map(w => 
                              w.id === webhook.id ? {...w, url: e.target.value} : w
                            ));
                          }}
                          placeholder="https://api.example.com/webhook"
                          className="flex-1"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => testWebhook(webhook.url, webhook.event)}
                        >
                          <TestTube className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>نص الرسالة</Label>
                      <Textarea
                        value={webhook.message}
                        onChange={(e) => {
                          setInvoiceWebhooks(invoiceWebhooks.map(w => 
                            w.id === webhook.id ? {...w, message: e.target.value} : w
                          ));
                        }}
                        placeholder="نص الرسالة التي سترسل"
                        rows={2}
                      />
                      <p className="text-xs text-muted-foreground">
                        المتغيرات المتاحة: {"{customer_name}, {invoice_id}, {amount}, {due_date}"}
                      </p>
                    </div>
                  </div>
                ))}
                <Button onClick={saveInvoiceWebhooks} className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  حفظ إعدادات الفواتير
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhook Logs */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                سجل الويب هوك
              </CardTitle>
              <CardDescription>
                عرض تاريخ إرسال الويب هوك والاستجابات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الحدث</TableHead>
                    <TableHead>الرابط</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الاستجابة</TableHead>
                    <TableHead>التوقيت</TableHead>
                    <TableHead>البيانات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhookLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.event}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {log.url}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-sm">{log.response}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{log.timestamp}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WebhookSettings;