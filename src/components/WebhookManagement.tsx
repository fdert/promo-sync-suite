import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, 
  Edit, 
  Trash2, 
  TestTube,
  Check,
  X,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WebhookSetting {
  id?: string;
  webhook_name: string;
  webhook_url: string;
  webhook_type: string;
  is_active: boolean;
  secret_key?: string;
  created_at?: string;
  updated_at?: string;
}

interface WebhookManagementProps {
  webhookSettings: WebhookSetting[];
  onSave: (webhook: Omit<WebhookSetting, 'id'>) => Promise<any>;
  onUpdate: (id: string, updates: Partial<WebhookSetting>) => Promise<any>;
  onTest: (url: string, type: string) => Promise<void>;
  loading?: boolean;
  webhookType?: string;
}

const WebhookManagement = ({ 
  webhookSettings, 
  onSave, 
  onUpdate, 
  onTest, 
  loading = false,
  webhookType = 'outgoing'
}: WebhookManagementProps) => {
  const [newWebhook, setNewWebhook] = useState<Omit<WebhookSetting, 'id'>>({
    webhook_name: '',
    webhook_url: '',
    webhook_type: webhookType,
    is_active: true,
    secret_key: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!newWebhook.webhook_name || !newWebhook.webhook_url) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await onSave(newWebhook);
      setNewWebhook({
        webhook_name: '',
        webhook_url: '',
        webhook_type: webhookType,
        is_active: true,
        secret_key: ''
      });
    } catch (error) {
      // Error handled in parent component
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<WebhookSetting>) => {
    try {
      await onUpdate(id, updates);
      setEditingId(null);
    } catch (error) {
      // Error handled in parent component
    }
  };

  const handleTest = async (webhook: WebhookSetting) => {
    try {
      await onTest(webhook.webhook_url, webhook.webhook_type);
    } catch (error) {
      // Error handled in parent component
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add New Webhook Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            إضافة ويب هوك جديد
          </CardTitle>
          <CardDescription>
            أضف رابط ويب هوك جديد لاستقبال الإشعارات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم الويب هوك</Label>
              <Input
                value={newWebhook.webhook_name}
                onChange={(e) => setNewWebhook({...newWebhook, webhook_name: e.target.value})}
                placeholder="مثال: n8n Webhook"
              />
            </div>
            <div className="space-y-2">
              <Label>رابط الويب هوك</Label>
              <Input
                value={newWebhook.webhook_url}
                onChange={(e) => setNewWebhook({...newWebhook, webhook_url: e.target.value})}
                placeholder="https://n8n.example.com/webhook/..."
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>مفتاح الأمان (اختياري)</Label>
              <Input
                type="password"
                value={newWebhook.secret_key || ''}
                onChange={(e) => setNewWebhook({...newWebhook, secret_key: e.target.value})}
                placeholder="مفتاح أمان للتحقق من الهوية"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">تفعيل الويب هوك</Label>
                <p className="text-sm text-muted-foreground">تشغيل/إيقاف إرسال الإشعارات</p>
              </div>
              <Switch 
                checked={newWebhook.is_active} 
                onCheckedChange={(checked) => setNewWebhook({...newWebhook, is_active: checked})}
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            إضافة ويب هوك
          </Button>
        </CardContent>
      </Card>

      {/* Webhook List */}
      <Card>
        <CardHeader>
          <CardTitle>الويب هوك المحفوظة</CardTitle>
          <CardDescription>
            إدارة وتعديل الويب هوك الموجودة
          </CardDescription>
        </CardHeader>
        <CardContent>
          {webhookSettings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">لا توجد ويب هوك محفوظة</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الرابط</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhookSettings.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell>
                      {editingId === webhook.id ? (
                        <Input
                          value={webhook.webhook_name}
                          onChange={(e) => {
                            const updated = {...webhook, webhook_name: e.target.value};
                            handleUpdate(webhook.id!, {webhook_name: e.target.value});
                          }}
                          onBlur={() => setEditingId(null)}
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium">{webhook.webhook_name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {webhook.webhook_url.length > 50 
                          ? `${webhook.webhook_url.substring(0, 50)}...` 
                          : webhook.webhook_url
                        }
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {webhook.webhook_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={webhook.is_active}
                          onCheckedChange={(checked) => 
                            handleUpdate(webhook.id!, {is_active: checked})
                          }
                        />
                        <Badge variant={webhook.is_active ? "default" : "secondary"}>
                          {webhook.is_active ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              نشط
                            </>
                          ) : (
                            <>
                              <X className="w-3 h-3 mr-1" />
                              متوقف
                            </>
                          )}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(webhook.id!)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTest(webhook)}
                        >
                          <TestTube className="h-4 w-4" />
                        </Button>
                      </div>
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

export default WebhookManagement;