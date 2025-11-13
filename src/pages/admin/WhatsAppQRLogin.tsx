import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Phone, Smartphone, CheckCircle2, AlertCircle, RefreshCw, MessageSquare, Send, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";


interface WhatsAppMessage {
  id: string;
  to_number: string;
  from_number?: string;
  message_content: string;
  message_type: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  customer_id: string | null;
  is_reply: boolean;
}

interface IncomingMessage {
  from: string;
  message: string;
  timestamp: number;
  messageId: string;
}

export default function WhatsAppQRLogin() {
  const [phoneNumber, setPhoneNumber] = useState("+966532709980");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyTo, setReplyTo] = useState<WhatsAppMessage | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [syncingMessages, setSyncingMessages] = useState(false);
  const { toast } = useToast();

  // Check for existing session and load messages
  useEffect(() => {
    checkExistingSession();
    loadMessages();
    
    // Auto-refresh messages every 30 seconds
    const interval = setInterval(loadMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  

  const checkExistingSession = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-qr-login', {
        body: { 
          action: 'check_status',
          phone_number: phoneNumber 
        }
      });

      if (error) throw error;

      if (data?.connected) {
        setIsConnected(true);
        setSessionInfo(data.session);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    }
  };

  const generatePairingCode = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-qr-login', {
        body: {
          action: 'generate_pairing_code',
          phone_number: phoneNumber,
        }
      });
      if (error) throw error;

      if (data?.pairing_code) {
        setPairingCode(data.pairing_code);
        setInstructions(data.instructions || [
          '1. افتح واتساب على جوالك',
          '2. الإعدادات > الأجهزة المرتبطة',
          '3. اضغط على "ربط جهاز"',
          '4. اختر "ربط باستخدام رقم الهاتف بدلاً من ذلك"',
          '5. أدخل الكود الظاهر هنا'
        ]);
        toast({
          title: '✅ تم إنشاء كود الربط',
          description: 'أدخل الكود في تطبيق الواتساب على هاتفك',
        });
      } else {
        throw new Error(data?.message || 'تعذر الحصول على كود الربط');
      }
    } catch (error: any) {
      console.error('Error generating pairing code:', error);
      toast({
        title: '❌ خطأ',
        description: error.message || 'تعذر إنشاء كود الربط',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };



  const loadMessages = async () => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const syncMessagesFromWorker = async () => {
    setSyncingMessages(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-qr-login', {
        body: { 
          action: 'fetch_messages',
          phone_number: phoneNumber 
        }
      });

      if (error) throw error;

      if (data.messages && data.messages.length > 0) {
        // حفظ الرسائل الواردة في قاعدة البيانات
        const insertPromises = data.messages.map((msg: IncomingMessage) => 
          supabase.from('whatsapp_messages').insert([{
            to_number: phoneNumber,
            message_content: msg.message,
            message_type: 'text',
            status: 'delivered',
            is_reply: true,
          }])
        );

        await Promise.all(insertPromises);

        toast({
          title: "✅ تم مزامنة الرسائل",
          description: `تم جلب ${data.messages.length} رسالة جديدة`,
        });
      } else {
        toast({
          title: "ℹ️ لا توجد رسائل جديدة",
          description: "لا توجد رسائل واردة جديدة للمزامنة",
        });
      }
      
      // Reload messages after syncing
      setTimeout(loadMessages, 1000);
    } catch (error: any) {
      console.error('Error syncing messages:', error);
      toast({
        title: "⚠️ خطأ",
        description: error.message || "حدث خطأ أثناء مزامنة الرسائل",
        variant: "destructive",
      });
    } finally {
      setSyncingMessages(false);
    }
  };

  const sendReply = async () => {
    if (!replyTo || !replyMessage.trim()) return;

    setSendingReply(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-qr-login', {
        body: { 
          action: 'send_message',
          phone_number: phoneNumber,
          to: replyTo.from_number || replyTo.to_number,
          message: replyMessage
        }
      });

      if (error) throw error;

      // حفظ الرسالة المرسلة في قاعدة البيانات
      await supabase.from('whatsapp_messages').insert([{
        to_number: replyTo.from_number || replyTo.to_number,
        message_content: replyMessage,
        message_type: 'text',
        status: 'sent',
        is_reply: false,
        sent_at: new Date().toISOString(),
      }]);

      toast({
        title: "✅ تم إرسال الرد",
        description: "تم إرسال رسالتك بنجاح",
      });

      setReplyMessage("");
      setReplyTo(null);
      
      // Reload messages
      setTimeout(loadMessages, 1000);
    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast({
        title: "⚠️ خطأ",
        description: error.message || "فشل إرسال الرد",
        variant: "destructive",
      });
    } finally {
      setSendingReply(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'default';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sent': return 'تم الإرسال';
      case 'pending': return 'قيد الانتظار';
      case 'failed': return 'فشل';
      default: return status;
    }
  };

  const disconnect = async () => {
    try {
      stop();
      const { error } = await supabase.functions.invoke('whatsapp-qr-login', {
        body: { 
          action: 'disconnect',
          phone_number: phoneNumber 
        }
      });

      if (error) throw error;

      setIsConnected(false);
      setSessionInfo(null);
      setPairingCode(null);
      setInstructions([]);

      toast({
        title: "✅ تم قطع الاتصال",
        description: "تم قطع الاتصال بالواتساب",
      });
    } catch (error: any) {
      toast({
        title: "❌ خطأ",
        description: error.message || "فشل قطع الاتصال",
        variant: "destructive",
      });
    }
  };

  const outgoingMessages = messages.filter(m => !m.is_reply);
  const incomingMessages = messages.filter(m => m.is_reply);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">تسجيل الدخول للواتساب</h1>
        <p className="text-muted-foreground">
          قم بإدخال كود الربط لربط حساب الواتساب وجلب جميع الرسائل
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              إعدادات الرقم
            </CardTitle>
            <CardDescription>
              أدخل رقم الواتساب الذي تريد ربطه
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الواتساب</Label>
              <Input
                id="phone"
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+966XXXXXXXXX"
                disabled={isConnected}
                dir="ltr"
                className="text-left"
              />
            </div>

            {!isConnected && (
              <Button
                onClick={generatePairingCode}
                disabled={isLoading || !phoneNumber}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4 ml-2" />
                    إنشاء كود الربط
                  </>
                )}
              </Button>
            )}

            {isConnected && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">متصل بنجاح</span>
                </div>
                <Button
                  onClick={disconnect}
                  variant="destructive"
                  className="w-full"
                >
                  قطع الاتصال
                </Button>
                <p className="text-xs text-muted-foreground">ملاحظة: للحفاظ على الاتصال، اترك هذه الصفحة مفتوحة.</p>

              </div>
            )}
          </CardContent>
        </Card>

        {pairingCode && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                كود الربط
              </CardTitle>
              <CardDescription>
                أدخل هذا الكود في تطبيق الواتساب على هاتفك
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <Smartphone className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-900 dark:text-green-100">كود الربط الخاص بك</AlertTitle>
                <AlertDescription className="space-y-3">
                  <div className="text-4xl font-bold text-center py-6 text-green-700 dark:text-green-300 tracking-widest" dir="ltr">
                    {pairingCode}
                  </div>
                  <div className="text-sm text-green-800 dark:text-green-200 space-y-1.5 pr-4">
                    {instructions.map((instruction, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-green-600 dark:text-green-400">•</span>
                        <span>{instruction}</span>
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>ملاحظة هامة</AlertTitle>
                <AlertDescription className="space-y-1">
                  <p>• هذا الربط حقيقي باستخدام كود الإقران من واتساب</p>
                  <p>• للحفاظ على الاتصال بشكل دائم نوصي بتشغيل عامل دائم (سنجهزه لك لاحقًا)</p>
                  <p>• الآن: اترك هذه الصفحة مفتوحة للحفاظ على الاتصال</p>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {isConnected && sessionInfo && (
          <Card>
            <CardHeader>
              <CardTitle>معلومات الجلسة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">الرقم:</span>
                <span className="font-mono" dir="ltr">{sessionInfo.phone_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">وقت الاتصال:</span>
                <span>{new Date(sessionInfo.connected_at).toLocaleString('ar-SA')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الحالة:</span>
                <span className="text-green-600 dark:text-green-400">نشط</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Messages Card */}
        <Card className="lg:row-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <CardTitle>الرسائل</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={syncMessagesFromWorker}
                  disabled={syncingMessages || !isConnected}
                >
                  {syncingMessages ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <Download className="h-4 w-4 ml-2" />
                  )}
                  مزامنة
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMessages}
                  disabled={loadingMessages}
                >
                  {loadingMessages ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <CardDescription>
              الرسائل الواردة والصادرة - يتم التحديث تلقائياً كل 30 ثانية
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="outgoing" dir="rtl">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="outgoing">
                  <Send className="h-4 w-4 ml-2" />
                  الصادرة ({outgoingMessages.length})
                </TabsTrigger>
                <TabsTrigger value="incoming">
                  <Download className="h-4 w-4 ml-2" />
                  الواردة ({incomingMessages.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="outgoing">
                <ScrollArea className="h-[600px] pr-4">
                  {outgoingMessages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      لا توجد رسائل صادرة
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {outgoingMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium" dir="ltr">{msg.to_number}</span>
                            </div>
                            <Badge variant={getStatusColor(msg.status)}>
                              {getStatusText(msg.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap">
                            {msg.message_content}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {new Date(msg.created_at).toLocaleString('ar-SA')}
                            </span>
                            {msg.sent_at && (
                              <span>
                                تم الإرسال: {new Date(msg.sent_at).toLocaleString('ar-SA')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="incoming">
                <ScrollArea className="h-[600px] pr-4">
                  {incomingMessages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      لا توجد رسائل واردة
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {incomingMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="p-4 border rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium" dir="ltr">{msg.to_number}</span>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline">وارد</Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setReplyTo(msg)}
                                disabled={!isConnected}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm mb-2 whitespace-pre-wrap">
                            {msg.message_content}
                          </p>
                          <div className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleString('ar-SA')}
                          </div>
                          
                          {replyTo?.id === msg.id && (
                            <div className="mt-4 space-y-2 border-t pt-4">
                              <Label htmlFor={`reply-${msg.id}`}>الرد على الرسالة</Label>
                              <div className="flex gap-2">
                                <Input
                                  id={`reply-${msg.id}`}
                                  value={replyMessage}
                                  onChange={(e) => setReplyMessage(e.target.value)}
                                  placeholder="اكتب رسالتك..."
                                  disabled={sendingReply}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      sendReply();
                                    }
                                  }}
                                />
                                <Button
                                  size="sm"
                                  onClick={sendReply}
                                  disabled={sendingReply || !replyMessage.trim()}
                                >
                                  {sendingReply ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setReplyTo(null);
                                    setReplyMessage("");
                                  }}
                                >
                                  إلغاء
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
