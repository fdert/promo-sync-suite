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
      const testData = {
        event: event + "_test",
        data: {
          test: true,
          timestamp: new Date().toISOString(),
          message: "هذا اختبار للويب هوك"
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });

      if (response.ok) {
        toast({
          title: "نجح الاختبار",
          description: "تم إرسال الويب هوك بنجاح",
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Webhook test failed:', error);
      toast({
        title: "فشل الاختبار",
        description: `فشل في إرسال الويب هوك: ${error}`,
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            واتساب
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
          <WebhookManagement 
            webhookSettings={webhookSettings}
            onSave={saveWebhookSetting}
            onUpdate={updateWebhookSetting}
            onTest={testWebhook}
            loading={loading}
          />
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