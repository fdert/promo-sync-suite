// @ts-nocheck
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
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("messages");
  const [conversations, setConversations] = useState([]);
  const [searchPhone, setSearchPhone] = useState('');
  const [filterDirection, setFilterDirection] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [replyInput, setReplyInput] = useState('');

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

  // جلب البيانات وتفعيل التحديث التلقائي
  useEffect(() => {
    fetchMessages();
    fetchWebhookSettings();
    fetchMessageTemplates();

    // إعداد Realtime للرسائل الجديدة
    const channel = supabase
      .channel('whatsapp-messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages'
        },
        (payload) => {
          console.log('رسالة جديدة:', payload);
          // تحديث الرسائل عند استقبال رسالة جديدة
          fetchMessages();
          toast({
            title: "رسالة جديدة 📩",
            description: "تم استقبال رسالة واتساب جديدة",
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_messages'
        },
        (payload) => {
          console.log('تحديث رسالة:', payload);
          // تحديث الرسائل عند تغيير حالة رسالة
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMessages = async (targetPhone = '', direction: 'all' | 'incoming' | 'outgoing' = 'all') => {
    try {
      console.log('Fetching messages...', { targetPhone, direction });
      
      let query = supabase
        .from('whatsapp_messages')
        .select(`
          *,
          customers(name, whatsapp, phone)
        `)
        .order('created_at', { ascending: false })
        .limit(1000);

      // تطبيق الفلتر حسب الاتجاه
      if (direction === 'incoming') {
        // الرسائل الواردة (ليست من system)
        query = query.neq('from_number', 'system').not('from_number', 'is', null);
      } else if (direction === 'outgoing') {
        // الرسائل الصادرة (من system)
        query = query.eq('from_number', 'system');
      }

      // تطبيق فلتر الرقم إذا تم تحديده
      if (targetPhone && targetPhone.trim()) {
        query = query.or(`from_number.eq.${targetPhone},to_number.eq.${targetPhone}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }
      
      console.log('Fetched messages:', data?.length || 0);
      
      const filteredMessages = data || [];
      setMessages(filteredMessages);
      
      // تجميع الرسائل في محادثات
      const conversationsMap = new Map();
      
      filteredMessages.forEach(message => {
        // تحديد رقم العميل (الطرف الآخر)
        let phoneNumber;
        
        if (message.from_number === 'system' || message.from_number === null) {
          // رسالة صادرة - العميل هو المستقبل
          phoneNumber = message.to_number;
        } else {
          // رسالة واردة - العميل هو المرسل
          phoneNumber = message.from_number;
        }
        
        // تخطي الرسائل بدون رقم
        if (!phoneNumber || phoneNumber === 'system') {
          return;
        }
        
        // البحث عن اسم العميل
        let customerName = 'غير محدد';
        if (message.customers?.name) {
          customerName = message.customers.name;
        }
        
        if (!conversationsMap.has(phoneNumber)) {
          conversationsMap.set(phoneNumber, {
            phoneNumber,
            customerName,
            customerId: message.customer_id,
            messages: [],
            lastMessageAt: message.created_at,
            unreadCount: 0
          });
        }
        
        const conversation = conversationsMap.get(phoneNumber);
        conversation.messages.push(message);
        
        // تحديث آخر وقت رسالة
        if (new Date(message.created_at) > new Date(conversation.lastMessageAt)) {
          conversation.lastMessageAt = message.created_at;
        }
        
        // تحديث اسم العميل إذا كان متوفراً
        if (customerName !== 'غير محدد') {
          conversation.customerName = customerName;
        }
      });
      
      // تحويل Map إلى مصفوفة وترتيبها حسب آخر رسالة
      const conversationsArray = Array.from(conversationsMap.values())
        .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      
      console.log('Total conversations:', conversationsArray.length);
      setConversations(conversationsArray);
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
    if (!replyText.trim()) return;

    try {
      setLoading(true);

      // تحديد رقم الواتساب الصحيح للإرسال
      let recipientNumber;
      if (selectedMessage) {
        recipientNumber = selectedMessage.to_number === 'system' 
          ? selectedMessage.from_number 
          : selectedMessage.to_number;
      } else if (selectedConversation) {
        recipientNumber = selectedConversation.phoneNumber;
      }

      if (!recipientNumber) {
        throw new Error('لم يتم تحديد رقم المستلم');
      }

      console.log('Sending reply to:', recipientNumber, 'Message:', replyText);

      // إرسال الرسالة عبر edge function
      const { data, error } = await supabase.functions.invoke('send-direct-whatsapp', {
        body: {
          phone: recipientNumber,
          message: replyText
        }
      });

      console.log('Reply response:', data);

      if (error) throw error;

      toast({
        title: "تم الإرسال",
        description: "تم إرسال الرد بنجاح وسيتم إرساله قريباً",
      });

      setReplyText("");
      setIsReplyDialogOpen(false);
      
      // تحديث الرسائل بعد ثانيتين
      setTimeout(() => {
        fetchMessages();
      }, 2000);
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في إرسال الرد",
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
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">إدارة الواتس آب</h1>
          <p className="text-muted-foreground">
            جميع المحادثات ({conversations.length} محادثة) • {messages.length} رسالة
          </p>
        </div>
        
        <div className="flex gap-2 items-center">
          <div className="flex gap-2">
            <Select value={filterDirection} onValueChange={(value: any) => {
              setFilterDirection(value);
              fetchMessages(searchPhone, value);
            }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الرسائل</SelectItem>
                <SelectItem value="incoming">واردة</SelectItem>
                <SelectItem value="outgoing">صادرة</SelectItem>
              </SelectContent>
            </Select>
            
            <Input
              placeholder="ابحث برقم الهاتف..."
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="w-64"
            />
            <Button 
              onClick={() => fetchMessages(searchPhone, filterDirection)}
              variant="secondary"
              size="sm"
            >
              بحث
            </Button>
            {searchPhone && (
              <Button 
                onClick={() => {
                  setSearchPhone('');
                  fetchMessages('', filterDirection);
                }}
                variant="outline"
                size="sm"
              >
                مسح
              </Button>
            )}
          </div>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* قائمة المحادثات */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  المحادثات ({conversations.length})
                </CardTitle>
                <CardDescription>
                  جميع محادثات الواتساب
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-y-auto">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.phoneNumber}
                      onClick={() => setSelectedConversation(conversation)}
                      className={`p-4 border-b cursor-pointer hover:bg-accent transition-colors ${
                        selectedConversation?.phoneNumber === conversation.phoneNumber 
                          ? 'bg-accent' 
                          : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <MessageCircle className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate">
                                {conversation.customerName}
                              </h4>
                              <p className="text-xs text-muted-foreground truncate">
                                {conversation.phoneNumber}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 truncate">
                            {conversation.messages[0]?.message_content}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground flex-shrink-0 mr-2">
                          {new Date(conversation.lastMessageAt).toLocaleDateString('ar-SA', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {conversation.messages.length} رسالة
                        </Badge>
                        {conversation.messages.some(m => m.status === 'failed') && (
                          <Badge variant="destructive" className="text-xs">
                            فشل
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {conversations.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>لا توجد محادثات</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* عرض المحادثة المحددة */}
            <Card className="lg:col-span-2">
              <CardHeader>
                {selectedConversation ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <MessageCircle className="h-5 w-5" />
                          {selectedConversation.customerName}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          {selectedConversation.phoneNumber}
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedMessage(selectedConversation.messages[0]);
                          setIsReplyDialogOpen(true);
                        }}
                        className="gap-2"
                      >
                        <Send className="h-4 w-4" />
                        إرسال رسالة
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <CardTitle>اختر محادثة</CardTitle>
                    <CardDescription>
                      اختر محادثة من القائمة لعرض الرسائل
                    </CardDescription>
                  </>
                )}
              </CardHeader>
              <CardContent>
                {selectedConversation ? (
                  <>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto">
                      {selectedConversation.messages
                        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                        .map((message) => {
                          const isOutgoing = message.from_number === 'system' || message.is_reply;
                        
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                isOutgoing
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm break-words">
                                    {message.message_content}
                                  </p>
                                  {message.media_url && (
                                    <Button
                                      variant="link"
                                      size="sm"
                                      onClick={() => window.open(message.media_url, '_blank')}
                                      className={`h-auto p-0 mt-1 ${
                                        isOutgoing 
                                          ? 'text-primary-foreground' 
                                          : 'text-primary'
                                      }`}
                                    >
                                      <ExternalLink className="h-3 w-3 ml-1" />
                                      عرض المرفق
                                    </Button>
                                  )}
                                  <div className={`flex items-center gap-2 mt-1 text-xs ${
                                    isOutgoing 
                                      ? 'text-primary-foreground/70' 
                                      : 'text-muted-foreground'
                                  }`}>
                                    <span>
                                      {new Date(message.created_at).toLocaleTimeString('ar-SA', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                    {isOutgoing && (
                                      <span className="flex items-center gap-1">
                                        {getStatusIcon(message.status)}
                                        {message.status}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* صندوق الرد السريع */}
                    <div className="border-t pt-4 mt-4">
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="اكتب ردك هنا..."
                          value={replyInput}
                          onChange={(e) => setReplyInput(e.target.value)}
                          rows={2}
                          className="flex-1"
                        />
                        <Button
                          onClick={async () => {
                            if (!replyInput.trim()) return;
                            
                            try {
                              setLoading(true);
                              const { data, error } = await supabase.functions.invoke('send-direct-whatsapp', {
                                body: {
                                  phone: selectedConversation.phoneNumber,
                                  message: replyInput
                                }
                              });

                              if (error) throw error;

                              toast({
                                title: "تم الإرسال",
                                description: "تم إرسال الرد بنجاح",
                              });

                              setReplyInput("");
                              setTimeout(() => fetchMessages(searchPhone, filterDirection), 2000);
                            } catch (error) {
                              console.error('Error:', error);
                              toast({
                                title: "خطأ",
                                description: "فشل إرسال الرد",
                                variant: "destructive",
                              });
                            } finally {
                              setLoading(false);
                            }
                          }}
                          disabled={loading || !replyInput.trim()}
                          className="gap-2"
                        >
                          <Send className="h-4 w-4" />
                          إرسال
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">اختر محادثة للبدء</p>
                    <p className="text-sm">حدد محادثة من القائمة لعرض الرسائل والرد</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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