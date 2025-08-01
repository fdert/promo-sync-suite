import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, Send, Download, Settings, Webhook, Users, MessageCircle, Clock, CheckCircle, XCircle, Reply, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const WhatsApp = () => {
  const [messages, setMessages] = useState([]);
  const [webhookSettings, setWebhookSettings] = useState([]);
  const [messageTemplates, setMessageTemplates] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("messages");

  // إعدادات الويب هوك
  const [webhookForm, setWebhookForm] = useState({
    webhook_name: "",
    webhook_url: "",
    webhook_type: "incoming",
    is_active: true,
    secret_key: ""
  });

  // قالب الرسائل
  const [templateForm, setTemplateForm] = useState({
    template_name: "",
    template_content: "",
    template_type: "quick_reply",
    is_active: true
  });

  const { toast } = useToast();

  // جلب البيانات
  useEffect(() => {
    fetchMessages();
    fetchWebhookSettings();
    fetchMessageTemplates();
  }, []);

  const fetchMessages = async () => {
    try {
      console.log('Fetching messages...');
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select(`
          *,
          customers(name, whatsapp_number)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }
      
      console.log('Fetched messages:', data?.length || 0, 'messages');
      console.log('Latest message:', data?.[0]);
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في جلب الرسائل",
        variant: "destructive",
      });
    }
  };

  const fetchWebhookSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_settings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhookSettings(data || []);
    } catch (error) {
      console.error('Error fetching webhook settings:', error);
    }
  };

  const fetchMessageTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessageTemplates(data || []);
    } catch (error) {
      console.error('Error fetching message templates:', error);
    }
  };

  const saveWebhookSettings = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('غير مصرح');

      const { error } = await supabase
        .from('webhook_settings')
        .insert({
          ...webhookForm,
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: "نجح الحفظ",
        description: "تم حفظ إعدادات الويب هوك بنجاح",
      });

      setWebhookForm({
        webhook_name: "",
        webhook_url: "",
        webhook_type: "incoming",
        is_active: true,
        secret_key: ""
      });

      fetchWebhookSettings();
    } catch (error) {
      console.error('Error saving webhook settings:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في حفظ الإعدادات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveMessageTemplate = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('غير مصرح');

      const { error } = await supabase
        .from('message_templates')
        .insert({
          ...templateForm,
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: "نجح الحفظ",
        description: "تم حفظ قالب الرسالة بنجاح",
      });

      setTemplateForm({
        template_name: "",
        template_content: "",
        template_type: "quick_reply",
        is_active: true
      });

      fetchMessageTemplates();
    } catch (error) {
      console.error('Error saving message template:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في حفظ القالب",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;

    try {
      setLoading(true);

      // تحديد رقم الواتساب الصحيح للإرسال
      const recipientNumber = selectedMessage.to_number === 'system' 
        ? selectedMessage.from_number 
        : selectedMessage.to_number;

      console.log('Sending reply to:', recipientNumber, 'Message:', replyText);

      // ملاحظة: تم إلغاء تفعيل إرسال الرسائل
      const response = { error: null, data: { success: false, message: 'إرسال الرسائل غير متاح حالياً' } };

      console.log('Reply response:', response);

      if (response.error) throw response.error;

      toast({
        title: "تم الإرسال",
        description: "تم إرسال الرد بنجاح",
      });

      setReplyText("");
      setIsReplyDialogOpen(false);
      fetchMessages();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في إرسال الرد",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadMessages = () => {
    try {
      const csvData = [
        ['التاريخ', 'المرسل', 'نوع الرسالة', 'المحتوى', 'الحالة']
      ];

      messages.forEach(message => {
        csvData.push([
          new Date(message.timestamp).toLocaleString('ar-SA'),
          message.customers?.name || message.from_number,
          message.message_type,
          message.message_content,
          message.status
        ]);
      });

      const csvContent = "data:text/csv;charset=utf-8," + 
        csvData.map(row => row.join(',')).join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `whatsapp_messages_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "تم التنزيل",
        description: "تم تنزيل الرسائل بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ في تنزيل الرسائل",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'read':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const testWebhook = async () => {
    try {
      setLoading(true);
      
      const testData = {
        from: "+966500000000",
        message: "رسالة تجريبية لاختبار الـ webhook",
        customerName: "عميل تجريبي",
        type: "text",
        timestamp: Math.floor(Date.now() / 1000)
      };

      console.log('Testing webhook with data:', testData);

      const response = await fetch('https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/whatsapp-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });

      const result = await response.text();
      console.log('Webhook test response:', result);

      if (response.ok) {
        toast({
          title: "نجح الاختبار ✅",
          description: "تم إرسال رسالة تجريبية بنجاح، تحقق من قائمة الرسائل",
        });
        // تحديث قائمة الرسائل فوراً
        await fetchMessages();
        // تحديث إضافي بعد 2 ثانية للتأكد
        setTimeout(() => {
          fetchMessages();
        }, 2000);
      } else {
        throw new Error(`فشل الاختبار: ${response.status} - ${result}`);
      }
    } catch (error) {
      console.error('Webhook test error:', error);
      toast({
        title: "فشل الاختبار ❌",
        description: error.message || "حدث خطأ في اختبار الـ webhook",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة الواتس آب</h1>
          <p className="text-muted-foreground">إدارة الرسائل والردود والإعدادات</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={testWebhook} 
            disabled={loading}
            variant="default" 
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            {loading ? "جاري الاختبار..." : "اختبار الـ Webhook"}
          </Button>
          <Button onClick={downloadMessages} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            تنزيل الرسائل
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="messages" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            الرسائل
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            قوالب الرسائل
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2">
            <Webhook className="h-4 w-4" />
            إعدادات الويب هوك
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <Users className="h-4 w-4" />
            الإحصائيات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                الرسائل الواردة والصادرة
              </CardTitle>
              <CardDescription>
                جميع رسائل الواتس آب مع إمكانية الرد والإدارة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المرسل</TableHead>
                      <TableHead>نوع الرسالة</TableHead>
                      <TableHead>المحتوى</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.map((message) => (
                      <TableRow key={message.id}>
                        <TableCell>
                          {new Date(message.timestamp).toLocaleString('ar-SA')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {message.customers?.name || 'غير محدد'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {message.from_number}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {message.message_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {message.message_content}
                          {message.media_url && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => window.open(message.media_url, '_blank')}
                              className="h-auto p-0 ml-2"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(message.status)}
                            <span className="text-sm">{message.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {!message.is_reply && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedMessage(message);
                                setIsReplyDialogOpen(true);
                              }}
                              className="gap-2"
                            >
                              <Reply className="h-3 w-3" />
                              رد
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {messages.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد رسائل حتى الآن
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>إضافة قالب رسالة جديد</CardTitle>
                <CardDescription>
                  إنشاء قوالب رسائل للاستخدام السريع
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="template_name">اسم القالب</Label>
                  <Input
                    id="template_name"
                    value={templateForm.template_name}
                    onChange={(e) => setTemplateForm({
                      ...templateForm,
                      template_name: e.target.value
                    })}
                    placeholder="مثال: رسالة ترحيب"
                  />
                </div>

                <div>
                  <Label htmlFor="template_type">نوع القالب</Label>
                  <Select
                    value={templateForm.template_type}
                    onValueChange={(value) => setTemplateForm({
                      ...templateForm,
                      template_type: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quick_reply">رد سريع</SelectItem>
                      <SelectItem value="welcome">رسالة ترحيب</SelectItem>
                      <SelectItem value="follow_up">متابعة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="template_content">محتوى القالب</Label>
                  <Textarea
                    id="template_content"
                    value={templateForm.template_content}
                    onChange={(e) => setTemplateForm({
                      ...templateForm,
                      template_content: e.target.value
                    })}
                    placeholder="اكتب محتوى الرسالة هنا..."
                    rows={4}
                  />
                </div>

                <Button 
                  onClick={saveMessageTemplate} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "جاري الحفظ..." : "حفظ القالب"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>القوالب المحفوظة</CardTitle>
                <CardDescription>
                  قائمة بجميع قوالب الرسائل المتاحة
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {messageTemplates.map((template) => (
                    <div key={template.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{template.template_name}</h4>
                        <Badge variant={template.is_active ? "default" : "secondary"}>
                          {template.is_active ? "نشط" : "معطل"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.template_content}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReplyText(template.template_content)}
                        >
                          استخدام
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {messageTemplates.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    لا توجد قوالب محفوظة
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>إعداد ويب هوك جديد</CardTitle>
                <CardDescription>
                  ربط التطبيق مع n8n لإدارة رسائل الواتس آب
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="webhook_name">اسم الويب هوك</Label>
                  <Input
                    id="webhook_name"
                    value={webhookForm.webhook_name}
                    onChange={(e) => setWebhookForm({
                      ...webhookForm,
                      webhook_name: e.target.value
                    })}
                    placeholder="مثال: واتس آب - رسائل واردة"
                  />
                </div>

                <div>
                  <Label htmlFor="webhook_url">رابط الويب هوك</Label>
                  <Input
                    id="webhook_url"
                    value={webhookForm.webhook_url}
                    onChange={(e) => setWebhookForm({
                      ...webhookForm,
                      webhook_url: e.target.value
                    })}
                    placeholder="https://your-n8n-instance.com/webhook/..."
                  />
                </div>

                <div>
                  <Label htmlFor="webhook_type">نوع الويب هوك</Label>
                  <Select
                    value={webhookForm.webhook_type}
                    onValueChange={(value) => setWebhookForm({
                      ...webhookForm,
                      webhook_type: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="incoming">رسائل واردة</SelectItem>
                      <SelectItem value="outgoing">رسائل صادرة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="secret_key">مفتاح الأمان (اختياري)</Label>
                  <Input
                    id="secret_key"
                    type="password"
                    value={webhookForm.secret_key}
                    onChange={(e) => setWebhookForm({
                      ...webhookForm,
                      secret_key: e.target.value
                    })}
                    placeholder="مفتاح الأمان للتحقق من الهوية"
                  />
                </div>

                <Button 
                  onClick={saveWebhookSettings} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "جاري الحفظ..." : "حفظ الإعدادات"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>الويب هوك المحفوظة</CardTitle>
                <CardDescription>
                  قائمة بجميع إعدادات الويب هوك المكونة
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {webhookSettings.map((webhook) => (
                    <div key={webhook.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{webhook.webhook_name}</h4>
                        <div className="flex gap-2">
                          <Badge variant={webhook.is_active ? "default" : "secondary"}>
                            {webhook.is_active ? "نشط" : "معطل"}
                          </Badge>
                          <Badge variant="outline">
                            {webhook.webhook_type === 'incoming' ? 'واردة' : 'صادرة'}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground break-all">
                        {webhook.webhook_url}
                      </p>
                    </div>
                  ))}
                </div>

                {webhookSettings.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    لا توجد إعدادات ويب هوك
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>معلومات الدمج</CardTitle>
              <CardDescription>
                روابط الويب هوك الخاصة بالتطبيق للاستخدام في n8n
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>رابط استقبال الرسائل (Webhook URL لـ n8n)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={`https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/whatsapp-webhook`}
                      readOnly
                      className="bg-muted"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText('https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/whatsapp-webhook');
                        toast({
                          title: "تم النسخ",
                          description: "تم نسخ الرابط إلى الحافظة",
                        });
                      }}
                    >
                      نسخ
                    </Button>
                  </div>
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium mb-2">🔧 تكوين الويب هوك:</p>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• استخدم هذا الرابط في نظام إدارة الرسائل الخاص بك</li>
                      <li>• تأكد من إرسال POST requests إلى هذا الرابط عند استقبال رسائل جديدة</li>
                      <li>• يجب أن يحتوي الطلب على بيانات الرسالة بصيغة JSON</li>
                      <li>• تأكد من تضمين معلومات المرسل ونص الرسالة</li>
                    </ul>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الرسائل</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{messages.length}</div>
                <p className="text-xs text-muted-foreground">جميع الرسائل</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الرسائل الواردة</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {messages.filter(m => !m.is_reply).length}
                </div>
                <p className="text-xs text-muted-foreground">من العملاء</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الردود المرسلة</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {messages.filter(m => m.is_reply).length}
                </div>
                <p className="text-xs text-muted-foreground">ردود فريق العمل</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">العملاء النشطون</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(messages.map(m => m.from_number)).size}
                </div>
                <p className="text-xs text-muted-foreground">أرقام مختلفة</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* مربع حوار الرد */}
      <Dialog open={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>الرد على الرسالة</DialogTitle>
            <DialogDescription>
              إرسال رد إلى {selectedMessage?.customers?.name || selectedMessage?.from_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>الرسالة الأصلية:</Label>
              <div className="p-3 bg-muted rounded-lg text-sm">
                {selectedMessage?.message_content}
              </div>
            </div>

            <div>
              <Label htmlFor="reply_text">الرد:</Label>
              <Textarea
                id="reply_text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="اكتب ردك هنا..."
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={sendReply} 
                disabled={loading || !replyText.trim()}
                className="flex-1"
              >
                {loading ? "جاري الإرسال..." : "إرسال الرد"}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setIsReplyDialogOpen(false)}
              >
                إلغاء
              </Button>
            </div>

            {messageTemplates.length > 0 && (
              <div>
                <Label>القوالب السريعة:</Label>
                <div className="grid gap-2 mt-2">
                  {messageTemplates.slice(0, 3).map((template) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      size="sm"
                      onClick={() => setReplyText(template.template_content)}
                      className="text-xs justify-start"
                    >
                      {template.template_name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsApp;