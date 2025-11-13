import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Phone, Smartphone, CheckCircle2, AlertCircle, RefreshCw, MessageSquare, Send, Download, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";


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

interface ChatContact {
  number: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
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
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [syncingMessages, setSyncingMessages] = useState(false);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    checkExistingSession();
    loadMessages();
    
    const interval = setInterval(loadMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    updateContactsList();
  }, [messages]);

  const updateContactsList = () => {
    const contactsMap = new Map<string, ChatContact>();
    
    messages.forEach(msg => {
      const contactNumber = msg.is_reply ? msg.from_number : msg.to_number;
      if (!contactNumber) return;

      const existing = contactsMap.get(contactNumber);
      const msgTime = new Date(msg.created_at);
      
      if (!existing || new Date(existing.lastMessageTime) < msgTime) {
        contactsMap.set(contactNumber, {
          number: contactNumber,
          lastMessage: msg.message_content.substring(0, 50),
          lastMessageTime: msg.created_at,
          unreadCount: 0
        });
      }
    });

    const contactsList = Array.from(contactsMap.values())
      .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
    
    setContacts(contactsList);
    
    if (!selectedContact && contactsList.length > 0) {
      setSelectedContact(contactsList[0].number);
    }
  };

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
        .limit(500);

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
        const insertPromises = data.messages.map((msg: IncomingMessage) => 
          supabase.from('whatsapp_messages').insert([{
            from_number: msg.from,
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
    if (!selectedContact || !replyMessage.trim()) return;

    setSendingReply(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-qr-login', {
        body: { 
          action: 'send_message',
          phone_number: phoneNumber,
          to: selectedContact,
          message: replyMessage
        }
      });

      if (error) throw error;

      await supabase.from('whatsapp_messages').insert([{
        to_number: selectedContact,
        message_content: replyMessage,
        message_type: 'text',
        status: 'sent',
        is_reply: false,
        sent_at: new Date().toISOString(),
      }]);

      toast({
        title: "✅ تم إرسال الرسالة",
        description: "تم إرسال رسالتك بنجاح",
      });

      setReplyMessage("");
      setTimeout(loadMessages, 1000);
    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast({
        title: "⚠️ خطأ",
        description: error.message || "فشل إرسال الرسالة",
        variant: "destructive",
      });
    } finally {
      setSendingReply(false);
    }
  };

  const handleDisconnect = async () => {
    try {
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

  const getContactMessages = () => {
    if (!selectedContact) return [];
    
    return messages
      .filter(msg => 
        (msg.is_reply && msg.from_number === selectedContact) ||
        (!msg.is_reply && msg.to_number === selectedContact)
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">تسجيل الدخول للواتساب</h1>
        <p className="text-muted-foreground">
          قم بإدخال كود الربط لربط حساب الواتساب وجلب جميع الرسائل
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
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
                  variant="destructive"
                  onClick={handleDisconnect}
                  className="w-full"
                >
                  قطع الاتصال
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {pairingCode && !isConnected && (
          <Card>
            <CardHeader>
              <CardTitle>كود الربط</CardTitle>
              <CardDescription>أدخل هذا الكود في تطبيق الواتساب</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold tracking-widest p-6 bg-primary/10 rounded-lg" dir="ltr">
                  {pairingCode}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  هذا الكود صالح لمدة دقائق قليلة
                </p>
              </div>

              {instructions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">خطوات الربط:</h4>
                  <ol className="text-sm space-y-1 text-muted-foreground">
                    {instructions.map((instruction, index) => (
                      <li key={index}>{instruction}</li>
                    ))}
                  </ol>
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>ملاحظة هامة</AlertTitle>
                <AlertDescription className="space-y-1">
                  <p>• هذا الربط حقيقي باستخدام كود الإقران من واتساب</p>
                  <p>• اترك هذه الصفحة مفتوحة للحفاظ على الاتصال</p>
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
      </div>

      <div className="flex w-full border rounded-lg overflow-hidden" style={{ height: '650px' }}>
        <div className="w-[300px] md:w-[350px] border-l bg-background flex-shrink-0">
          <div className="p-4 border-b bg-muted/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">المحادثات</h3>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={syncMessagesFromWorker}
                  disabled={syncingMessages || !isConnected}
                >
                  {syncingMessages ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
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
          </div>

          <ScrollArea className="h-[calc(650px-80px)]">
            {contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm">لا توجد محادثات</p>
                <p className="text-xs">استخدم "مزامنة" لجلب الرسائل</p>
              </div>
            ) : (
              <div className="divide-y">
                {contacts.map((contact) => (
                  <div
                    key={contact.number}
                    onClick={() => setSelectedContact(contact.number)}
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedContact === contact.number ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-semibold text-sm truncate" dir="ltr">
                            {contact.number}
                          </p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(contact.lastMessageTime).toLocaleTimeString('ar-SA', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {contact.lastMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex-1 min-w-0 flex flex-col bg-[#efeae2] dark:bg-[#0b141a]">
          {selectedContact ? (
            <>
              <div className="p-4 border-b bg-background flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold" dir="ltr">{selectedContact}</p>
                  <p className="text-xs text-muted-foreground">اضغط لعرض التفاصيل</p>
                </div>
              </div>

              <div className="flex-1 relative">
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}></div>
                
                <ScrollArea className="h-full px-6 py-4 relative z-10">
                  <div className="space-y-2">
                    {getContactMessages().map((msg) => {
                      const isOutgoing = !msg.is_reply;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-2`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 shadow-sm ${
                              isOutgoing
                                ? 'bg-[#d9fdd3] dark:bg-[#005c4b]'
                                : 'bg-white dark:bg-[#202c33]'
                            }`}
                          >
                            <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                              {msg.message_content}
                            </div>
                            
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                {new Date(msg.created_at).toLocaleTimeString('ar-SA', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              
                              {isOutgoing && (
                                <span className="text-gray-500 dark:text-gray-400">
                                  {msg.status === 'sent' && '✓'}
                                  {msg.status === 'delivered' && '✓✓'}
                                  {msg.status === 'read' && '✓✓'}
                                  {msg.status === 'failed' && '✗'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              <div className="p-4 border-t bg-background">
                <div className="flex gap-2">
                  <Input
                    placeholder="اكتب رسالتك..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !sendingReply && replyMessage.trim()) {
                        sendReply();
                      }
                    }}
                    className="flex-1"
                    disabled={!isConnected}
                  />
                  <Button
                    onClick={sendReply}
                    disabled={sendingReply || !replyMessage.trim() || !isConnected}
                    className="bg-[#00a884] hover:bg-[#008f6f] dark:bg-[#00a884] dark:hover:bg-[#008f6f]"
                  >
                    {sendingReply ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="h-20 w-20 mb-4 opacity-20" />
              <p className="text-lg">اختر محادثة لبدء المراسلة</p>
              <p className="text-sm">استخدم "مزامنة" لجلب الرسائل الجديدة</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
