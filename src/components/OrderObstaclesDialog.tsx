// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, AlertTriangle, Send, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cleanPhoneNumber } from "@/lib/utils";

interface Obstacle {
  id?: string;
  obstacle_type: string;
  description: string;
  customer_notified: boolean;
  notified_at?: string;
  created_at?: string;
}

interface OrderObstaclesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  customerPhone?: string;
  customerName?: string;
}

const OBSTACLE_TYPES = [
  { value: 'تأخر_توفير_المتطلبات', label: 'تأخر العميل في توفير المتطلبات' },
  { value: 'تأخر_الرد_البروفة', label: 'تأخر العميل في الرد على البروفة' },
  { value: 'تعديلات_متكررة', label: 'تعديلات متكررة من العميل' },
  { value: 'نقص_معلومات', label: 'نقص في المعلومات المطلوبة' },
  { value: 'تأخر_الدفع', label: 'تأخر في الدفع' },
  { value: 'عدم_التواصل', label: 'عدم تواصل العميل' },
  { value: 'تغيير_المواصفات', label: 'تغيير في مواصفات الطلب' },
  { value: 'أخرى', label: 'أسباب أخرى' },
];

export const OrderObstaclesDialog: React.FC<OrderObstaclesDialogProps> = ({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  customerPhone,
  customerName,
}) => {
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // جلب المعوقات الحالية
  const fetchObstacles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('order_obstacles')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setObstacles(data.map(item => ({
          id: item.id,
          obstacle_type: item.obstacle_type,
          description: item.description,
          customer_notified: item.customer_notified || false,
          notified_at: item.notified_at,
          created_at: item.created_at,
        })));
      } else {
        setObstacles([{
          obstacle_type: '',
          description: '',
          customer_notified: false,
        }]);
      }
    } catch (error) {
      console.error('Error fetching obstacles:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب المعوقات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && orderId) {
      fetchObstacles();
    }
  }, [isOpen, orderId]);

  // إضافة معوق جديد
  const addObstacle = () => {
    setObstacles([...obstacles, {
      obstacle_type: '',
      description: '',
      customer_notified: false,
    }]);
  };

  // حذف معوق
  const removeObstacle = async (index: number) => {
    const obstacle = obstacles[index];
    
    if (obstacle.id) {
      try {
        const { error } = await supabase
          .from('order_obstacles')
          .delete()
          .eq('id', obstacle.id);
        
        if (error) throw error;
      } catch (error) {
        console.error('Error deleting obstacle:', error);
        toast({
          title: "خطأ",
          description: "فشل في حذف المعوق",
          variant: "destructive",
        });
        return;
      }
    }
    
    const updated = obstacles.filter((_, i) => i !== index);
    setObstacles(updated.length > 0 ? updated : [{
      obstacle_type: '',
      description: '',
      customer_notified: false,
    }]);
  };

  // تحديث قيمة معوق
  const updateObstacle = (index: number, field: keyof Obstacle, value: any) => {
    const updated = [...obstacles];
    updated[index] = { ...updated[index], [field]: value };
    setObstacles(updated);
  };

  // الحصول على تسمية نوع المعوق
  const getObstacleTypeLabel = (type: string) => {
    return OBSTACLE_TYPES.find(t => t.value === type)?.label || type;
  };

  // حفظ المعوقات
  const saveObstacles = async () => {
    setSaving(true);
    try {
      const validObstacles = obstacles.filter(o => o.obstacle_type && o.description.trim());
      
      if (validObstacles.length === 0) {
        toast({
          title: "تنبيه",
          description: "يرجى إضافة معوق واحد على الأقل مع الوصف",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      for (const obstacle of validObstacles) {
        if (obstacle.id) {
          const { error } = await supabase
            .from('order_obstacles')
            .update({
              obstacle_type: obstacle.obstacle_type,
              description: obstacle.description,
            })
            .eq('id', obstacle.id);
          
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('order_obstacles')
            .insert({
              order_id: orderId,
              obstacle_type: obstacle.obstacle_type,
              description: obstacle.description,
              customer_notified: false,
              created_by: user?.id,
            });
          
          if (error) throw error;
        }
      }

      toast({
        title: "تم الحفظ",
        description: "تم حفظ المعوقات بنجاح",
      });
      
      await fetchObstacles();
    } catch (error) {
      console.error('Error saving obstacles:', error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ المعوقات",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // إرسال إشعار واتساب للعميل
  const sendNotificationToCustomer = async () => {
    if (!customerPhone) {
      toast({
        title: "خطأ",
        description: "رقم هاتف العميل غير متوفر",
        variant: "destructive",
      });
      return;
    }

    const unnotifiedObstacles = obstacles.filter(o => o.id && !o.customer_notified && o.description.trim());
    
    if (unnotifiedObstacles.length === 0) {
      toast({
        title: "تنبيه",
        description: "لا توجد معوقات جديدة لإرسالها",
        variant: "destructive",
      });
      return;
    }

    setSendingNotification(true);
    try {
      // بناء قائمة المعوقات
      const obstaclesList = unnotifiedObstacles.map((o, i) => 
        `${i + 1}. ${getObstacleTypeLabel(o.obstacle_type)}\n   ${o.description}`
      ).join('\n\n');

      // جلب قالب الرسالة
      const { data: template } = await supabase
        .from('message_templates')
        .select('content')
        .eq('name', 'order_obstacles_notification')
        .eq('is_active', true)
        .single();

      let messageContent = template?.content || `⚠️ عزيزنا العميل

نود إبلاغكم بخصوص طلبكم رقم: {{order_number}}

📋 يوجد بعض المعوقات التي قد تؤثر على موعد التسليم:

{{obstacles_list}}

⏰ نرجو منكم التكرم بمعالجة هذه النقاط لضمان تسليم طلبكم في الوقت المحدد.

📞 للاستفسار أو المساعدة، لا تترددوا بالتواصل معنا.

شكراً لتفهمكم وتعاونكم 🙏`;

      // استبدال المتغيرات
      messageContent = messageContent
        .replace(/{{order_number}}/g, orderNumber)
        .replace(/{{obstacles_list}}/g, obstaclesList);

      const cleanedPhone = cleanPhoneNumber(customerPhone);

      // إرسال عبر webhook
      const { data: webhook } = await supabase
        .from('webhook_settings')
        .select('webhook_url')
        .eq('webhook_type', 'whatsapp')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (webhook?.webhook_url) {
        await fetch(webhook.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'order_obstacles_notification',
            data: {
              phone: cleanedPhone,
              to: cleanedPhone,
              message: messageContent,
              order_number: orderNumber,
              customer_name: customerName,
            }
          }),
        });
      }

      // إضافة الرسالة لجدول الواتساب
      await supabase.from('whatsapp_messages').insert({
        to_number: cleanedPhone,
        message_content: messageContent,
        message_type: 'text',
        status: 'pending',
        is_reply: false,
        dedupe_key: `obstacles_${orderId}_${Date.now()}`,
      });

      // تحديث حالة الإرسال للمعوقات
      for (const obstacle of unnotifiedObstacles) {
        await supabase
          .from('order_obstacles')
          .update({
            customer_notified: true,
            notified_at: new Date().toISOString(),
          })
          .eq('id', obstacle.id);
      }

      toast({
        title: "تم الإرسال",
        description: "تم إرسال إشعار المعوقات للعميل عبر الواتساب",
      });

      // تشغيل معالج الواتساب
      try {
        await supabase.functions.invoke('process-whatsapp-queue', {
          body: { source: 'order_obstacles_notification' }
        });
      } catch (e) {
        console.log('Queue processing triggered');
      }

      await fetchObstacles();
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: "خطأ",
        description: "فشل في إرسال الإشعار",
        variant: "destructive",
      });
    } finally {
      setSendingNotification(false);
    }
  };

  const hasUnnotifiedObstacles = obstacles.some(o => o.id && !o.customer_notified && o.description.trim());

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            ملاحظات ومعوقات الطلب - {orderNumber}
          </DialogTitle>
          <DialogDescription>
            سجّل الملاحظات والمعوقات التي تعيق أو تؤخر تسليم الطلب، ويمكنك إرسال إشعار للعميل
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">جاري التحميل...</div>
        ) : (
          <div className="space-y-4">
            {obstacles.map((obstacle, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3 bg-amber-50/50 border-amber-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">معوق #{index + 1}</span>
                    {obstacle.customer_notified && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        تم إبلاغ العميل
                      </Badge>
                    )}
                  </div>
                  {obstacles.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeObstacle(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>نوع المعوق *</Label>
                    <Select
                      value={obstacle.obstacle_type}
                      onValueChange={(value) => updateObstacle(index, 'obstacle_type', value)}
                      disabled={obstacle.customer_notified}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع المعوق" />
                      </SelectTrigger>
                      <SelectContent>
                        {OBSTACLE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {obstacle.notified_at && (
                    <div className="space-y-2">
                      <Label>تاريخ الإبلاغ</Label>
                      <p className="text-sm text-muted-foreground p-2 bg-muted rounded">
                        {new Date(obstacle.notified_at).toLocaleString('ar-SA')}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>وصف المعوق *</Label>
                  <Textarea
                    value={obstacle.description}
                    onChange={(e) => updateObstacle(index, 'description', e.target.value)}
                    placeholder="اكتب تفاصيل المعوق أو الملاحظة..."
                    rows={3}
                    disabled={obstacle.customer_notified}
                  />
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addObstacle} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              إضافة معوق آخر
            </Button>

            <div className="flex gap-2 justify-between pt-4 border-t">
              <Button
                variant="secondary"
                onClick={sendNotificationToCustomer}
                disabled={sendingNotification || !hasUnnotifiedObstacles || !customerPhone}
              >
                <Send className="h-4 w-4 mr-2" />
                {sendingNotification ? 'جاري الإرسال...' : 'إرسال إشعار للعميل'}
              </Button>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={saving}>
                  إلغاء
                </Button>
                <Button onClick={saveObstacles} disabled={saving}>
                  {saving ? 'جاري الحفظ...' : 'حفظ المعوقات'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
