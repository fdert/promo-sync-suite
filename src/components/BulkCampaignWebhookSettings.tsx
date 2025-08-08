import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ExternalLink, Send, History } from "lucide-react";

interface WebhookSetting {
  id: string;
  webhook_name: string;
  webhook_type: string;
  webhook_url: string;
  is_active: boolean;
  secret_key?: string;
  created_at: string;
  updated_at: string;
}

interface WebhookLog {
  id: string;
  webhook_type: string;
  campaign_id: string;
  webhook_url: string;
  trigger_type: string;
  status: string;
  response_data: any;
  error_message?: string;
  created_at: string;
}

const BulkCampaignWebhookSettings = () => {
  const [settings, setSettings] = useState<WebhookSetting | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchLogs();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_settings')
        .select('*')
        .eq('webhook_type', 'bulk_campaign')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setWebhookUrl(data.webhook_url);
        setIsActive(data.is_active);
      }
    } catch (error) {
      console.error('Error fetching webhook settings:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل إعدادات الـ webhook",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .eq('webhook_type', 'bulk_campaign')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching webhook logs:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (settings) {
        // تحديث الإعدادات الموجودة
        const { error } = await supabase
          .from('webhook_settings')
          .update({
            webhook_url: webhookUrl,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // إنشاء إعدادات جديدة
        const { error } = await supabase
          .from('webhook_settings')
          .insert({
            webhook_name: 'Bulk Campaign Webhook',
            webhook_type: 'bulk_campaign',
            webhook_url: webhookUrl,
            is_active: isActive,
            created_by: user.user?.id,
          });

        if (error) throw error;
      }

      toast({
        title: "تم الحفظ",
        description: "تم حفظ إعدادات الـ webhook بنجاح",
      });

      fetchSettings();
    } catch (error) {
      console.error('Error saving webhook settings:', error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ إعدادات الـ webhook",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testWebhook = async () => {
    if (!webhookUrl) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رابط الـ webhook أولاً",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('bulk-campaign-webhook', {
        body: {
          campaign_id: 'test-campaign-id',
          webhook_url: webhookUrl,
          trigger_type: 'test'
        }
      });

      if (error) throw error;

      toast({
        title: "تم الاختبار",
        description: "تم إرسال webhook تجريبي بنجاح",
      });

      fetchLogs();
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast({
        title: "خطأ في الاختبار",
        description: "فشل في إرسال webhook التجريبي",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            إعدادات Webhook للرسائل الجماعية
          </CardTitle>
          <CardDescription>
            قم بإعداد webhook للتكامل مع n8n أو أي نظام أتمتة آخر. سيتم إرسال إشعارات تلقائية عند اكتمال الحملات.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">رابط الـ Webhook</Label>
            <Input
              id="webhook-url"
              placeholder="https://your-n8n-instance.com/webhook/bulk-campaigns"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              أدخل رابط الـ webhook الخاص بـ n8n أو أي نظام أتمتة آخر
            </p>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <Switch
              id="webhook-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="webhook-active">تفعيل الـ Webhook</Label>
          </div>

          <div className="flex gap-2">
            <Button onClick={saveSettings} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              حفظ الإعدادات
            </Button>
            <Button 
              variant="outline" 
              onClick={testWebhook} 
              disabled={testing || !webhookUrl}
            >
              {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="ml-2 h-4 w-4" />
              اختبار الـ Webhook
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-medium">معلومات إضافية</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• سيتم إرسال webhook تلقائياً عند اكتمال كل حملة رسائل جماعية</p>
              <p>• البيانات المرسلة تشمل: معرف الحملة، الاسم، عدد المستلمين، معدل النجاح</p>
              <p>• يمكن استخدام هذا مع n8n لتشغيل workflows تلقائية</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            سجل الـ Webhooks
          </CardTitle>
          <CardDescription>
            آخر 10 محاولات إرسال webhook
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              لا توجد سجلات webhook بعد
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>معرف الحملة</TableHead>
                  <TableHead>نوع التفعيل</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {log.campaign_id?.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {log.trigger_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={log.status === 'sent' ? 'default' : 'destructive'}
                      >
                        {log.status === 'sent' ? 'تم الإرسال' : 'فشل'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(log.created_at).toLocaleString('ar-SA')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkCampaignWebhookSettings;