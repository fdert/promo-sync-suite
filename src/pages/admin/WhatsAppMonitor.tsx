import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, Clock, Send, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface WhatsAppMessage {
  id: string;
  from_number: string;
  to_number: string;
  message_content: string;
  message_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  replied_at?: string;
}

interface WebhookSetting {
  id: string;
  webhook_name: string;
  webhook_type: string;
  webhook_url: string;
  is_active: boolean;
  created_at: string;
}

export default function WhatsAppMonitor() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPending, setProcessingPending] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // جلب رسائل الواتساب مع ترتيب أفضل
      const { data: messagesData, error: messagesError } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .order('status', { ascending: true }) // المعلقة أولاً
        .order('created_at', { ascending: false })
        .limit(100); // زيادة العدد لعرض أفضل

      if (messagesError) throw messagesError;

      // جلب إعدادات الويب هوك النشطة فقط
      const { data: webhooksData, error: webhooksError } = await supabase
        .from('webhook_settings')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (webhooksError) throw webhooksError;

      setMessages(messagesData || []);
      setWebhooks(webhooksData || []);
      
      console.log(`📊 تم جلب ${messagesData?.length || 0} رسالة و ${webhooksData?.length || 0} ويب هوك نشط`);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processPendingMessages = async () => {
    try {
      setProcessingPending(true);
      
      console.log('🚀 استدعاء Edge Function لمعالجة الرسائل المعلقة...');
      
      const { data, error } = await supabase.functions.invoke('process-whatsapp-queue', {
        body: JSON.stringify({ 
          action: 'process_pending_messages',
          timestamp: new Date().toISOString()
        }),
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (error) {
        console.error('Error processing pending messages:', error);
        toast({
          title: "خطأ",
          description: `فشل في معالجة الرسائل المعلقة: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('Processing result:', data);
      
      if (data?.processed_count > 0) {
        const successCount = data.results?.filter((r: any) => r.status === 'sent')?.length || 0;
        const failedCount = data.results?.filter((r: any) => r.status === 'failed')?.length || 0;
        
        toast({
          title: "تمت المعالجة",
          description: `تم معالجة ${data.processed_count} رسالة. نجح ${successCount}، فشل ${failedCount}`,
        });
        
        // إذا كان هناك رسائل معلقة أكثر، اعرض إشعار
        if (data.processed_count === 10) {
          toast({
            title: "تنبيه",
            description: "تم معالجة 10 رسائل. قد يكون هناك المزيد من الرسائل المعلقة. اضغط مرة أخرى للمتابعة.",
            variant: "default",
          });
        }
      } else {
        toast({
          title: "مكتمل",
          description: data?.message || "لا توجد رسائل معلقة للمعالجة",
        });
      }
      
      // إعادة جلب البيانات
      await fetchData();
    } catch (error) {
      console.error('Error processing pending messages:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء معالجة الرسائل المعلقة",
        variant: "destructive",
      });
    } finally {
      setProcessingPending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />مُرسل</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />معلق</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />فشل</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getWebhookTypeBadge = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'outgoing': 'طلبات صادرة',
      'proof': 'بروفة',
      'invoice': 'فواتير',
      'whatsapp': 'واتساب عام'
    };
    
    return <Badge variant="outline">{typeMap[type] || type}</Badge>;
  };

  const pendingCount = messages.filter(m => m.status === 'pending').length;
  const failedCount = messages.filter(m => m.status === 'failed').length;
  const activeWebhooks = webhooks.filter(w => w.is_active).length;

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">مراقب الواتساب</h1>
          <p className="text-muted-foreground">مراقبة حالة رسائل الواتساب وإعدادات الويب هوك</p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          تحديث
        </Button>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={pendingCount > 0 ? "border-yellow-200 bg-yellow-50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">رسائل معلقة</CardTitle>
            <Clock className={`h-4 w-4 ${pendingCount > 0 ? 'text-yellow-600' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${pendingCount > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
              {pendingCount}
            </div>
            {pendingCount > 0 && (
              <p className="text-xs text-yellow-600 mt-1">يحتاج معالجة</p>
            )}
          </CardContent>
        </Card>

        <Card className={failedCount > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">رسائل فاشلة</CardTitle>
            <AlertCircle className={`h-4 w-4 ${failedCount > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${failedCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {failedCount}
            </div>
            {failedCount > 0 && (
              <p className="text-xs text-red-600 mt-1">يحتاج مراجعة</p>
            )}
          </CardContent>
        </Card>

        <Card className={activeWebhooks === 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ويب هوك نشط</CardTitle>
            <CheckCircle className={`h-4 w-4 ${activeWebhooks > 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${activeWebhooks > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {activeWebhooks}
            </div>
            <p className={`text-xs mt-1 ${activeWebhooks > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {activeWebhooks > 0 ? 'متصل' : 'غير متصل'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الرسائل</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messages.length}</div>
            <p className="text-xs text-muted-foreground mt-1">آخر 100 رسالة</p>
          </CardContent>
        </Card>
      </div>

      {/* تحذيرات */}
      {pendingCount > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>يوجد {pendingCount} رسائل معلقة</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>هناك رسائل في انتظار الإرسال. اضغط لمعالجتها.</span>
            <div className="flex gap-2">
              <Button 
                onClick={processPendingMessages} 
                disabled={processingPending}
                size="sm"
                className="ml-2"
              >
                {processingPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    معالجة الرسائل ({Math.min(pendingCount, 10)})
                  </>
                )}
              </Button>
              <Button 
                onClick={async () => {
                  if (processingPending) return;
                  
                  setProcessingPending(true);
                  try {
                    let totalProcessed = 0;
                    let maxIterations = 50; // حد أقصى للتكرار لمنع الحلقة اللا نهائية
                    
                    while (maxIterations > 0) {
                      // جلب عدد الرسائل المعلقة الحالي من قاعدة البيانات مباشرة
                      const { data: pendingData } = await supabase
                        .from('whatsapp_messages')
                        .select('id')
                        .eq('status', 'pending')
                        .limit(1);
                      
                      if (!pendingData || pendingData.length === 0) {
                        toast({
                          title: "مكتمل ✅",
                          description: `تمت معالجة جميع الرسائل بنجاح! إجمالي المعالج: ${totalProcessed}`,
                        });
                        break;
                      }
                      
                      // معالجة دفعة من الرسائل
                      const { data, error } = await supabase.functions.invoke('process-whatsapp-queue', {
                        body: JSON.stringify({ 
                          action: 'process_pending_messages',
                          timestamp: new Date().toISOString()
                        }),
                        headers: { 'Content-Type': 'application/json' }
                      });
                      
                      if (error || !data?.processed_count) {
                        console.error('Error in auto processing:', error);
                        break;
                      }
                      
                      totalProcessed += data.processed_count;
                      maxIterations--;
                      
                      // انتظار بين الدفعات
                      await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                    
                    if (maxIterations === 0) {
                      toast({
                        title: "تحذير ⚠️",
                        description: `تم إيقاف المعالجة بعد ${totalProcessed} رسالة لمنع الحلقة اللا نهائية`,
                        variant: "destructive",
                      });
                    }
                    
                  } catch (error) {
                    console.error('Auto processing error:', error);
                    toast({
                      title: "خطأ",
                      description: "فشل في المعالجة التلقائية",
                      variant: "destructive",
                    });
                  } finally {
                    setProcessingPending(false);
                    await fetchData(); // تحديث البيانات في النهاية
                  }
                }}
                disabled={processingPending}
                size="sm"
                variant="outline"
              >
                {processingPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    معالجة تلقائية...
                  </>
                ) : (
                  `معالجة تلقائية للكل (${pendingCount})`
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="messages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="messages">الرسائل</TabsTrigger>
          <TabsTrigger value="webhooks">إعدادات الويب هوك</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>رسائل الواتساب</CardTitle>
              <CardDescription>آخر 50 رسالة واتساب مع حالة الإرسال</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الرقم</TableHead>
                    <TableHead>المحتوى</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>وقت الإنشاء</TableHead>
                    <TableHead>وقت الإرسال</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell className="font-medium">{message.to_number}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {message.message_content.slice(0, 100)}...
                      </TableCell>
                      <TableCell>{message.message_type}</TableCell>
                      <TableCell>{getStatusBadge(message.status)}</TableCell>
                      <TableCell>
                        {new Date(message.created_at).toLocaleString('ar-SA')}
                      </TableCell>
                      <TableCell>
                        {message.replied_at 
                          ? new Date(message.replied_at).toLocaleString('ar-SA')
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الويب هوك</CardTitle>
              <CardDescription>جميع إعدادات الويب هوك المتاحة</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الرابط</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>وقت الإنشاء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((webhook) => (
                    <TableRow key={webhook.id}>
                      <TableCell className="font-medium">{webhook.webhook_name}</TableCell>
                      <TableCell>{getWebhookTypeBadge(webhook.webhook_type)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {webhook.webhook_url}
                      </TableCell>
                      <TableCell>
                        {webhook.is_active ? (
                          <Badge className="bg-green-100 text-green-800">نشط</Badge>
                        ) : (
                          <Badge variant="secondary">غير نشط</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(webhook.created_at).toLocaleString('ar-SA')}
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
}