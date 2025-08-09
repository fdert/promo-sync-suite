import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import WebhookManagement from "@/components/WebhookManagement";
import BulkCampaignWebhookSettings from "@/components/BulkCampaignWebhookSettings";

const WebhookSettings = () => {
  const [webhookSettings, setWebhookSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchWebhookSettings();
  }, []);

  const fetchWebhookSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_settings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setWebhookSettings(data || []);
    } catch (error) {
      console.error('Error fetching webhook settings:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل إعدادات الويب هوك",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveWebhookSetting = async (webhookData: {
    webhook_name: string;
    webhook_url: string;
    webhook_type: string;
    is_active: boolean;
    secret_key?: string;
  }) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('webhook_settings')
        .insert({
          ...webhookData,
          created_by: user.user?.id
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setWebhookSettings([data, ...webhookSettings]);
      
      toast({
        title: "تم الحفظ",
        description: "تم حفظ إعدادات الويب هوك بنجاح",
      });

      return data;
    } catch (error) {
      console.error('Error saving webhook settings:', error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ إعدادات الويب هوك",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateWebhookSetting = async (id: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from('webhook_settings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setWebhookSettings(webhookSettings.map(w => w.id === id ? data : w));
      
      toast({
        title: "تم التحديث",
        description: "تم تحديث إعدادات الويب هوك بنجاح",
      });

      return data;
    } catch (error) {
      console.error('Error updating webhook settings:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث إعدادات الويب هوك",
        variant: "destructive",
      });
      throw error;
    }
  };

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

    try {
      // استخدام Edge Function لاختبار الويب هوك لتجنب مشاكل CORS
      console.log('Testing webhook:', { url, event });
      
      const { data, error } = await supabase.functions.invoke('webhook-test', {
        body: {
          webhook_url: url,
          event: event + "_test",
          test_data: {
            test: true,
            timestamp: new Date().toISOString(),
            message: "هذا اختبار للويب هوك",
            customerPhone: '+966535983261',
            customerName: 'عميل تجريبي',
            notificationType: event
          }
        }
      });

      console.log('Webhook test response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`خطأ في استدعاء الدالة: ${error.message}`);
      }

      if (data?.success) {
        toast({
          title: "نجح الاختبار",
          description: `تم إرسال الويب هوك بنجاح. الحالة: ${data.status || 'غير محدد'}`,
        });
      } else {
        console.error('Webhook test failed:', data);
        const errorMsg = data?.error || 'فشل في الاختبار - لم يتم الحصول على استجابة صحيحة';
        const details = data?.response ? 
          `الحالة: ${data.status}, الاستجابة: ${data.response.substring(0, 100)}` : 
          data?.details || 'لا توجد تفاصيل إضافية';
        
        toast({
          title: "فشل الاختبار",
          description: `${errorMsg}. ${details}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Webhook test failed:', error);
      toast({
        title: "فشل الاختبار",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء اختبار الويب هوك",
        variant: "destructive",
      });
    }
  };

  const createTestMessage = async () => {
    try {
      console.log('إنشاء رسالة تجريبية مباشرة في قاعدة البيانات...');
      
      // إنشاء رسالة تجريبية مباشرة في قاعدة البيانات
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .insert({
          from_number: 'system',
          to_number: '+966535983261',
          message_type: 'text',
          message_content: `رسالة تجريبية للتأكد من عمل النظام - ${new Date().toLocaleString('ar-SA')}`,
          status: 'pending',
          is_reply: false,
        })
        .select();

      if (error) {
        console.error('خطأ في إنشاء الرسالة:', error);
        toast({
          title: "خطأ",
          description: `فشل في إنشاء الرسالة التجريبية: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('تم إنشاء الرسالة بنجاح:', data);
      
      toast({
        title: "تم إنشاء الرسالة",
        description: "تم إنشاء رسالة تجريبية بنجاح وستتم معالجتها تلقائياً",
      });
      
      // تحديث قائمة الرسائل إذا كانت الصفحة تعرضها
      fetchWebhookSettings();
      
    } catch (error) {
      console.error('Error creating test message:', error);
      toast({
        title: "خطأ",
        description: `حدث خطأ أثناء إنشاء الرسالة التجريبية: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-success/10 text-success"><Check className="w-3 h-3 mr-1" />نجح</Badge>;
      case "failed":
        return <Badge className="bg-destructive/10 text-destructive"><X className="w-3 h-3 mr-1" />فشل</Badge>;
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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            واتساب
          </TabsTrigger>
          <TabsTrigger value="bulk" className="gap-2">
            <Send className="h-4 w-4" />
            الإرسال الجماعي
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            الطلبات
          </TabsTrigger>
          <TabsTrigger value="evaluations" className="gap-2">
            <Webhook className="h-4 w-4" />
            التقييمات
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="h-4 w-4" />
            الفواتير
          </TabsTrigger>
          <TabsTrigger value="proof" className="gap-2">
            <Eye className="h-4 w-4" />
            البروفة
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Webhook className="h-4 w-4" />
            السجلات
          </TabsTrigger>
        </TabsList>

        {/* WhatsApp Configuration */}
        <TabsContent value="whatsapp">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  اختبار رسائل الواتساب
                </CardTitle>
                <CardDescription>
                  إرسال رسالة تجريبية للتأكد من عمل النظام
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium">رقم الواتساب للاختبار:</label>
                    <div className="mt-1 p-2 bg-muted rounded text-sm">
                      +966535983261
                    </div>
                  </div>
                  <Button 
                    onClick={createTestMessage}
                    className="whitespace-nowrap"
                    disabled={loading}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    إنشاء ومعالجة رسالة تجريبية
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  ✅ سيتم استخدام هذا الرقم أيضاً لاختبار رسائل حالة الطلبات والفواتير
                </div>
              </CardContent>
            </Card>
            
            <WebhookManagement 
              webhookSettings={webhookSettings}
              onSave={saveWebhookSetting}
              onUpdate={updateWebhookSetting}
              onTest={testWebhook}
              loading={loading}
            />
          </div>
        </TabsContent>

        {/* Bulk Campaign Webhooks */}
        <TabsContent value="bulk">
          <BulkCampaignWebhookSettings />
        </TabsContent>

        {/* Order Webhooks */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                ويب هوك الطلبات
              </CardTitle>
              <CardDescription>
                إضافة وإدارة ويب هوك لإشعارات الطلبات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WebhookManagement 
                webhookSettings={webhookSettings.filter(w => w.webhook_type === 'outgoing')}
                onSave={saveWebhookSetting}
                onUpdate={updateWebhookSetting}
                onTest={testWebhook}
                loading={loading}
                webhookType="outgoing"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evaluation Webhooks */}
        <TabsContent value="evaluations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                ويب هوك التقييمات
              </CardTitle>
              <CardDescription>
                إضافة وإدارة ويب هوك مخصص لرسائل التقييم ومراجعات جوجل
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WebhookManagement 
                webhookSettings={webhookSettings.filter(w => w.webhook_type === 'evaluation')}
                onSave={saveWebhookSetting}
                onUpdate={updateWebhookSetting}
                onTest={testWebhook}
                loading={loading}
                webhookType="evaluation"
              />
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
                إضافة وإدارة ويب هوك لإشعارات الفواتير
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WebhookManagement 
                webhookSettings={webhookSettings.filter(w => w.webhook_type === 'invoice')}
                onSave={saveWebhookSetting}
                onUpdate={updateWebhookSetting}
                onTest={testWebhook}
                loading={loading}
                webhookType="invoice"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Proof Webhooks */}
        <TabsContent value="proof">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                ويب هوك البروفة
              </CardTitle>
              <CardDescription>
                إضافة وإدارة ويب هوك لإشعارات إرسال البروفة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WebhookManagement 
                webhookSettings={webhookSettings.filter(w => w.webhook_type === 'proof')}
                onSave={saveWebhookSetting}
                onUpdate={updateWebhookSetting}
                onTest={testWebhook}
                loading={loading}
                webhookType="proof"
              />
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
                   <TableRow>
                     <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                       لا توجد سجلات ويب هوك حتى الآن
                     </TableCell>
                   </TableRow>
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