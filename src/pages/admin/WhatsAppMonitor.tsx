import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, Clock, Send, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
      
      // جلب رسائل الواتساب
      const { data: messagesData, error: messagesError } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (messagesError) throw messagesError;

      // جلب إعدادات الويب هوك
      const { data: webhooksData, error: webhooksError } = await supabase
        .from('webhook_settings')
        .select('*')
        .order('created_at', { ascending: false });

      if (webhooksError) throw webhooksError;

      setMessages(messagesData || []);
      setWebhooks(webhooksData || []);
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
      
      const { data, error } = await supabase.functions.invoke('send-pending-whatsapp');
      
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
          description: `تم إرسال ${successCount} رسالة بنجاح، فشل ${failedCount} رسالة`,
        });
      } else {
        toast({
          title: "لا توجد رسائل معلقة",
          description: "لم يتم العثور على رسائل معلقة للمعالجة",
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">رسائل معلقة</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">رسائل فاشلة</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ويب هوك نشط</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeWebhooks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الرسائل</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messages.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* تحذيرات */}
      {pendingCount > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>يوجد {pendingCount} رسالة معلقة لم يتم إرسالها بعد.</span>
            <Button 
              onClick={processPendingMessages} 
              disabled={processingPending}
              size="sm"
            >
              {processingPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              معالجة الرسائل المعلقة
            </Button>
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