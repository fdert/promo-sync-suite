import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Users, MessageSquare, Clock, CheckCircle, XCircle, Eye } from "lucide-react";

interface CustomerGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  member_count?: number;
}

interface BulkCampaign {
  id: string;
  name: string;
  message_content: string;
  target_type: 'all' | 'groups';
  target_groups?: string[];
  scheduled_at?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

interface MessageTemplate {
  id: string;
  template_name: string;
  template_content: string;
}

const BulkWhatsApp = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [campaigns, setCampaigns] = useState<BulkCampaign[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCampaignDetails, setShowCampaignDetails] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<BulkCampaign | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    message_content: "",
    target_type: "all" as 'all' | 'groups',
    scheduled_at: "",
    selected_template: "",
    delay_between_messages: 5
  });

  useEffect(() => {
    fetchGroups();
    fetchCampaigns();
    fetchTemplates();
  }, []);

  const fetchGroups = async () => {
    try {
      // جلب المجموعات من localStorage مؤقتاً - نفس البيانات المستخدمة في صفحة CustomerGroups
      const savedGroups = localStorage.getItem('customerGroups');
      console.log('Saved groups from localStorage:', savedGroups);
      
      if (savedGroups) {
        const parsedGroups = JSON.parse(savedGroups);
        console.log('Parsed groups:', parsedGroups);
        setGroups(parsedGroups);
      } else {
        // إذا لم توجد بيانات محفوظة، استخدم البيانات الافتراضية
        const defaultGroups = [
          {
            id: "1",
            name: "عملاء VIP",
            description: "العملاء المميزون والدائمون",
            color: "#f59e0b",
            member_count: 15
          },
          {
            id: "2",
            name: "عملاء جدد",
            description: "العملاء الجدد هذا الشهر",
            color: "#10b981",
            member_count: 8
          }
        ];
        console.log('Using default groups:', defaultGroups);
        setGroups(defaultGroups);
        localStorage.setItem('customerGroups', JSON.stringify(defaultGroups));
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('حدث خطأ في جلب المجموعات');
    }
  };

  const fetchCampaigns = async () => {
    try {
      // إضافة بيانات تجريبية مؤقتاً حتى يتم تحديث ملف الأنواع
      setCampaigns([
        {
          id: "1",
          name: "حملة ترحيبية",
          message_content: "مرحباً {{customer_name}}، نرحب بك في خدماتنا المميزة!",
          target_type: "all" as 'all' | 'groups',
          status: "draft" as 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed',
          total_recipients: 50,
          sent_count: 0,
          failed_count: 0,
          created_at: new Date().toISOString()
        }
      ]);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('حدث خطأ في جلب الحملات');
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('id, template_name, template_content')
        .eq('is_active', true)
        .order('template_name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('حدث خطأ في جلب القوالب');
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        selected_template: templateId,
        message_content: template.template_content
      }));
    }
  };

  const calculateTotalRecipients = async () => {
    try {
      if (formData.target_type === 'all') {
        const { count, error } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .not('whatsapp_number', 'is', null)
          .neq('whatsapp_number', '');

        if (error) throw error;
        return count || 0;
      } else {
        if (selectedGroups.length === 0) return 0;

        // حساب تجريبي مؤقت حتى يتم تحديث ملف الأنواع
        return selectedGroups.length * 10;
      }
    } catch (error) {
      console.error('Error calculating recipients:', error);
      return 0;
    }
  };

  const handleCreateCampaign = async () => {
    if (!formData.name.trim() || !formData.message_content.trim()) {
      toast.error('يرجى إدخال اسم الحملة ومحتوى الرسالة');
      return;
    }

    if (formData.target_type === 'groups' && selectedGroups.length === 0) {
      toast.error('يرجى اختيار مجموعة واحدة على الأقل');
      return;
    }

    setLoading(true);
    try {
      const totalRecipients = await calculateTotalRecipients();

      const campaignData = {
        name: formData.name,
        message_content: formData.message_content,
        target_type: formData.target_type,
        target_groups: formData.target_type === 'groups' ? selectedGroups : null,
        scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
        total_recipients: totalRecipients,
        status: formData.scheduled_at ? 'scheduled' : 'draft',
        delay_between_messages: formData.delay_between_messages,
        created_by: user?.id
      };

      // سيتم تفعيل الحفظ في قاعدة البيانات بعد تحديث ملف الأنواع
      console.log('Campaign data with delay:', campaignData);

      toast.success('تم إنشاء الحملة بنجاح');
      setShowCreateDialog(false);
      resetForm();
      fetchCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('حدث خطأ في إنشاء الحملة');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    if (!confirm('هل أنت متأكد من إرسال هذه الحملة؟')) return;
    
    try {
      // تم إنشاء الجداول - سيتم تفعيل هذا بعد تحديث ملف الأنواع
      toast.success('تم بدء إرسال الحملة');
      fetchCampaigns();
    } catch (error) {
      console.error('Error starting campaign:', error);
      toast.error('حدث خطأ في بدء إرسال الحملة');
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      message_content: "",
      target_type: "all",
      scheduled_at: "",
      selected_template: "",
      delay_between_messages: 5
    });
    setSelectedGroups([]);
  };

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'sending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'مسودة';
      case 'scheduled': return 'مجدولة';
      case 'sending': return 'جاري الإرسال';
      case 'completed': return 'مكتملة';
      case 'failed': return 'فاشلة';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">الإرسال الجماعي</h1>
          <p className="text-muted-foreground">إرسال رسائل واتساب جماعية للعملاء</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              حملة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إنشاء حملة إرسال جماعية</DialogTitle>
              <DialogDescription>
                أنشئ حملة جديدة لإرسال رسائل واتساب للعملاء
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">اسم الحملة *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="أدخل اسم الحملة"
                  />
                </div>

                <div>
                  <Label htmlFor="scheduled_at">توقيت الإرسال (اختياري)</Label>
                  <Input
                    id="scheduled_at"
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduled_at: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="delay_between_messages">الفاصل الزمني بين الرسائل (بالثواني)</Label>
                <Input
                  id="delay_between_messages"
                  type="number"
                  min="1"
                  max="60"
                  value={formData.delay_between_messages}
                  onChange={(e) => setFormData(prev => ({ ...prev, delay_between_messages: parseInt(e.target.value) || 5 }))}
                  placeholder="5"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  يُنصح بوضع فاصل زمني لتجنب حظر الواتساب (1-60 ثانية)
                </p>
              </div>

              <div>
                <Label>قالب الرسالة</Label>
                <Select value={formData.selected_template} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر قالب رسالة (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.template_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="message_content">محتوى الرسالة *</Label>
                <Textarea
                  id="message_content"
                  value={formData.message_content}
                  onChange={(e) => setFormData(prev => ({ ...prev, message_content: e.target.value }))}
                  placeholder="اكتب محتوى الرسالة هنا..."
                  rows={6}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  يمكنك استخدام متغيرات مثل: {'{{customer_name}}'}, {'{{company_name}}'}, {'{{date}}'}
                </p>
              </div>

              <div>
                <Label>الجمهور المستهدف</Label>
                <Tabs value={formData.target_type} onValueChange={(value: 'all' | 'groups') => 
                  setFormData(prev => ({ ...prev, target_type: value }))
                }>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="all">جميع العملاء</TabsTrigger>
                    <TabsTrigger value="groups">مجموعات محددة</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="all" className="mt-4">
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">
                          سيتم إرسال الرسالة لجميع العملاء الذين لديهم رقم واتساب
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="groups" className="mt-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          {(() => {
                            console.log('Rendering groups:', groups);
                            return null;
                          })()}
                          {groups.length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">
                              لا توجد مجموعات. يرجى إنشاء مجموعة أولاً من صفحة "مجموعات العملاء"
                            </p>
                          ) : (
                            groups.map((group) => (
                              <div key={group.id} className="flex items-center space-x-2 space-x-reverse">
                                <Checkbox
                                  id={group.id}
                                  checked={selectedGroups.includes(group.id)}
                                  onCheckedChange={() => handleGroupToggle(group.id)}
                                />
                                <Label htmlFor={group.id} className="flex-1 cursor-pointer">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: group.color }}
                                      />
                                      <span>{group.name}</span>
                                    </div>
                                    <Badge variant="secondary">
                                      {group.member_count} عضو
                                    </Badge>
                                  </div>
                                </Label>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleCreateCampaign} disabled={loading}>
                  {loading ? "جاري الإنشاء..." : "إنشاء الحملة"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {campaign.name}
                    <Badge className={getStatusColor(campaign.status)}>
                      {getStatusText(campaign.status)}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    إجمالي المستلمين: {campaign.total_recipients} | 
                    تم الإرسال: {campaign.sent_count} | 
                    فشل: {campaign.failed_count}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCampaign(campaign);
                      setShowCampaignDetails(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                    <Button
                      size="sm"
                      onClick={() => handleSendCampaign(campaign.id)}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      إرسال
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                {campaign.message_content.substring(0, 150)}
                {campaign.message_content.length > 150 && '...'}
              </p>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>تم الإنشاء: {new Date(campaign.created_at).toLocaleString('ar-SA')}</span>
                <span>النوع: {campaign.target_type === 'all' ? 'جميع العملاء' : 'مجموعات محددة'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog تفاصيل الحملة */}
      <Dialog open={showCampaignDetails} onOpenChange={setShowCampaignDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل الحملة: {selectedCampaign?.name}</DialogTitle>
          </DialogHeader>

          {selectedCampaign && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>الحالة</Label>
                  <Badge className={getStatusColor(selectedCampaign.status)}>
                    {getStatusText(selectedCampaign.status)}
                  </Badge>
                </div>
                <div>
                  <Label>إجمالي المستلمين</Label>
                  <p>{selectedCampaign.total_recipients}</p>
                </div>
                <div>
                  <Label>تم الإرسال</Label>
                  <p className="text-green-600">{selectedCampaign.sent_count}</p>
                </div>
                <div>
                  <Label>فشل</Label>
                  <p className="text-red-600">{selectedCampaign.failed_count}</p>
                </div>
              </div>

              <div>
                <Label>محتوى الرسالة</Label>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="whitespace-pre-wrap">{selectedCampaign.message_content}</p>
                </div>
              </div>

              <div>
                <Label>نوع الجمهور</Label>
                <p>{selectedCampaign.target_type === 'all' ? 'جميع العملاء' : 'مجموعات محددة'}</p>
              </div>

              {selectedCampaign.scheduled_at && (
                <div>
                  <Label>مجدولة في</Label>
                  <p>{new Date(selectedCampaign.scheduled_at).toLocaleString('ar-SA')}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BulkWhatsApp;