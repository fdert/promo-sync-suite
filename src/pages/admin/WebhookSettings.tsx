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
  Eye,
  Users
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
      
      // التحقق من وجود webhook من نفس النوع
      const { data: existing } = await supabase
        .from('webhook_settings')
        .select('id')
        .eq('webhook_type', webhookData.webhook_type)
        .maybeSingle();

      let data, error;

      if (existing) {
        // تحديث الـ webhook الموجود
        const result = await supabase
          .from('webhook_settings')
          .update({
            ...webhookData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        data = result.data;
        error = result.error;

        if (!error) {
          setWebhookSettings(webhookSettings.map(w => w.id === existing.id ? data : w));
        }
      } else {
        // إضافة webhook جديد
        const result = await supabase
          .from('webhook_settings')
          .insert({
            ...webhookData,
            created_by: user.user?.id
          })
          .select()
          .single();
        
        data = result.data;
        error = result.error;

        if (!error) {
          setWebhookSettings([data, ...webhookSettings]);
        }
      }

      if (error) {
        throw error;
      }
      
      toast({
        title: existing ? "تم التحديث" : "تم الحفظ",
        description: existing 
          ? "تم تحديث إعدادات الويب هوك بنجاح" 
          : "تم حفظ إعدادات الويب هوك بنجاح",
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
      console.log('إرسال رسالة تجريبية مباشرة عبر ويب هوك...');
      
      // البحث عن webhook "واتساب التقارير المالية"
      const financialWebhook = webhookSettings.find(w => 
        w.webhook_name === 'واتساب التقارير المالية' && w.is_active === true
      );
      
      if (!financialWebhook) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على ويب هوك 'واتساب التقارير المالية' أو أنه غير نشط",
          variant: "destructive",
        });
        return;
      }
      
      console.log('📋 تفاصيل ويب هوك واتساب التقارير المالية:', {
        name: financialWebhook.webhook_name,
        url: financialWebhook.webhook_url,
        type: financialWebhook.webhook_type,
        created_at: financialWebhook.created_at,
        order_statuses: financialWebhook.order_statuses
      });
      
      // إعداد بيانات الرسالة بتنسيق مختلف للاختبار
      const testFormats = [
        // التنسيق الأول - مثل رسائل الطلبات
        {
          customerPhone: '+966535983261',
          customerName: 'مستخدم تجريبي',
          orderNumber: 'TEST-001',
          serviceName: 'اختبار الواتساب',
          amount: '0',
          status: 'اختبار',
          companyName: 'وكالة الإبداع للدعاية والإعلان',
          message: `🔔 رسالة تجريبية للتأكد من عمل النظام\n\n` +
                   `العميل: مستخدم تجريبي\n` +
                   `رقم الواتساب: +966535983261\n` +
                   `الوقت: ${new Date().toLocaleString('ar-SA')}\n\n` +
                   `✅ إذا وصلتك هذه الرسالة فالنظام يعمل بشكل صحيح`,
          timestamp: new Date().toISOString(),
          notificationType: 'test_message'
        },
        // التنسيق الثاني - تنسيق بسيط
        {
          to: '+966535983261',
          message: `رسالة تجريبية من وكالة الإبداع - ${new Date().toLocaleString('ar-SA')}`,
          type: 'text'
        },
        // التنسيق الثالث - تنسيق WhatsApp API
        {
          messaging_product: 'whatsapp',
          to: '+966535983261',
          type: 'text',
          text: {
            body: `رسالة تجريبية من وكالة الإبداع للدعاية والإعلان\n\nالتاريخ: ${new Date().toLocaleString('ar-SA')}\n\nهذه رسالة اختبار لنظام الواتساب`
          }
        }
      ];
      
      let successCount = 0;
      
      for (let i = 0; i < testFormats.length; i++) {
        const messageData = testFormats[i];
        
        console.log(`🧪 محاولة الإرسال ${i + 1} بالتنسيق:`, messageData);
        
        try {
          // إرسال مباشر لويب هوك واتساب التقارير المالية
          const response = await fetch(financialWebhook.webhook_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Ibda-WhatsApp-Test/1.0',
              'Accept': 'application/json',
              ...(financialWebhook.secret_key && {
                'Authorization': `Bearer ${financialWebhook.secret_key}`
              })
            },
            body: JSON.stringify(messageData)
          });
          
          const responseText = await response.text();
          
          console.log(`📨 نتيجة المحاولة ${i + 1}:`, {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type'),
            responseSize: responseText.length,
            responsePreview: responseText.substring(0, 200),
            fullResponse: responseText
          });
          
          if (response.ok) {
            successCount++;
            
            // تسجيل الرسالة في قاعدة البيانات
            const { error: dbError } = await supabase
              .from('whatsapp_messages')
              .insert({
                from_number: 'system',
                to_number: '+966535983261',
                message_type: 'text',
                message_content: (messageData as any).message || 
                  (messageData as any).text?.body || 
                  JSON.stringify(messageData),
                status: 'sent',
                is_reply: false
              });
            
            if (dbError) {
              console.error('خطأ في حفظ الرسالة:', dbError);
            }
          }
          
          // انتظار قصير بين المحاولات
          if (i < testFormats.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
        } catch (error) {
          console.error(`❌ خطأ في المحاولة ${i + 1}:`, error);
        }
      }
      
      if (successCount > 0) {
        toast({
          title: "تم إرسال الطلبات لويب هوك التقارير المالية",
          description: `تم إرسال ${successCount} من ${testFormats.length} طلبات بنجاح لويب هوك: ${financialWebhook.webhook_name}\n\n📱 تحقق من واتساب +966535983261 خلال 5 دقائق\n\n⚠️ إذا لم تصل الرسالة، فالمشكلة في إعداد الويب هوك نفسه وليس في النظام`,
        });
        
        // عرض تفاصيل إضافية في الكونسول
        console.log(`✅ تم إرسال ${successCount} طلبات بنجاح من أصل ${testFormats.length}`);
        console.log(`📱 يجب أن تصل الرسائل لرقم: +966535983261`);
        console.log(`🔗 الويب هوك المستخدم: ${financialWebhook.webhook_name} (${financialWebhook.webhook_url})`);
        console.log(`📝 ملاحظة: إذا لم تصل الرسائل، تحقق من إعدادات الويب هوك في n8n أو المنصة المستخدمة`);
        
      } else {
        toast({
          title: "فشل في جميع المحاولات",
          description: `فشل في إرسال جميع التنسيقات للويب هوك. تحقق من إعدادات الويب هوك.`,
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error('Error sending test message:', error);
      toast({
        title: "خطأ في الاتصال",
        description: `حدث خطأ أثناء الاتصال بالويب هوك: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const testFinancialReportWebhook = async () => {
    try {
      console.log('🧪 اختبار ويب هوك التقارير المالية...');
      
      toast({
        title: "جاري الاختبار...",
        description: "يتم اختبار ويب هوك التقارير المالية",
      });

      // البحث عن webhook "واتساب التقارير المالية"
      const financialWebhook = webhookSettings.find(w => 
        w.webhook_name === 'واتساب التقارير المالية' && w.is_active === true
      );
      
      if (!financialWebhook) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على ويب هوك 'واتساب التقارير المالية' أو أنه غير نشط",
          variant: "destructive",
        });
        return;
      }

      // جلب عميل للاختبار أو إنشاء واحد تجريبي
      let testCustomer;
      const { data: existingCustomers, error: customerError } = await supabase
        .from('customers')
        .select('id, name, whatsapp_number, phone')
        .limit(1);

      if (customerError) {
        console.error('❌ خطأ في جلب العملاء:', customerError);
        toast({
          title: "خطأ",
          description: "فشل في الوصول لقاعدة بيانات العملاء",
          variant: "destructive",
        });
        return;
      }

      if (existingCustomers && existingCustomers.length > 0) {
        testCustomer = existingCustomers[0];
      } else {
        // إنشاء عميل تجريبي
        console.log('📝 إنشاء عميل تجريبي للاختبار...');
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            name: 'عميل تجريبي للاختبار',
            whatsapp_number: '+966535983261',
            phone: '+966535983261',
            notes: 'عميل تم إنشاؤه تلقائياً لاختبار النظام',
            status: 'نشط'
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ خطأ في إنشاء العميل التجريبي:', createError);
          toast({
            title: "خطأ",
            description: "فشل في إنشاء عميل تجريبي للاختبار",
            variant: "destructive",
          });
          return;
        }

        testCustomer = newCustomer;
        console.log('✅ تم إنشاء عميل تجريبي:', testCustomer.name);
      }

      const phone = testCustomer.whatsapp_number || testCustomer.phone || '+966535983261';

      // إنشاء رسالة تقرير مالي تجريبي
      const testFinancialReport = `
🧪 اختبار تقرير مالي
━━━━━━━━━━━━━━━━━━━━

العميل: ${testCustomer.name}
الرقم: ${phone}

المبلغ المستحق: 100 ر.س
عدد الطلبات المعلقة: 2
أقرب تاريخ استحقاق: ${new Date().toLocaleDateString('ar-SA')}

آخر الطلبات:
• طلب TEST-001 - مبلغ: 50 ر.س
• طلب TEST-002 - مبلغ: 50 ر.س

تاريخ التقرير: ${new Date().toLocaleString('ar-SA')}

✅ هذا اختبار لنظام التقارير المالية
      `;

      console.log('📝 التقرير المالي التجريبي:', testFinancialReport);

      // حفظ رسالة الاختبار في قاعدة البيانات
      const { data: savedMessage, error: saveError } = await supabase
        .from('whatsapp_messages')
        .insert({
          from_number: 'test_financial_system',
          to_number: phone,
          message_type: 'text',
          message_content: testFinancialReport,
          status: 'pending',
          customer_id: testCustomer.id
        })
        .select()
        .single();

      if (saveError) {
        console.error('❌ خطأ في حفظ رسالة الاختبار:', saveError);
        toast({
          title: "خطأ",
          description: "فشل في حفظ رسالة الاختبار",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ تم حفظ رسالة الاختبار، ID:', savedMessage.id);

      // اختبار الويب هوك مباشرة
      const startTime = Date.now();
      const webhookResponse = await fetch(financialWebhook.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone,
          message: testFinancialReport,
          customer_name: testCustomer.name,
          message_id: savedMessage.id,
          test_mode: true,
          notification_type: 'financial_report_test',
          timestamp: new Date().toISOString()
        })
      });
      const endTime = Date.now();

      const responseText = await webhookResponse.text();
      const responseTime = endTime - startTime;

      console.log('📊 نتيجة اختبار الويب هوك:', {
        url: financialWebhook.webhook_url,
        status: webhookResponse.status,
        statusText: webhookResponse.statusText,
        responseTime: responseTime + 'ms',
        response: responseText
      });

      if (webhookResponse.ok) {
        // تحديث حالة الرسالة إلى sent
        await supabase
          .from('whatsapp_messages')
          .update({ 
            status: 'sent',
            error_message: null
          })
          .eq('id', savedMessage.id);

        toast({
          title: "نجح الاختبار ✅",
          description: `تم اختبار ويب هوك التقارير المالية بنجاح
الحالة: ${webhookResponse.status}
زمن الاستجابة: ${responseTime}ms
الرقم المستهدف: ${phone}
يجب أن تصل الرسالة خلال 5 دقائق`,
        });
      } else {
        // تحديث حالة الرسالة إلى failed
        await supabase
          .from('whatsapp_messages')
          .update({ 
            status: 'failed',
            error_message: `Webhook test failed: ${webhookResponse.status} - ${responseText}`
          })
          .eq('id', savedMessage.id);

        toast({
          title: "فشل الاختبار ❌",
          description: `فشل في اختبار الويب هوك
الحالة: ${webhookResponse.status}
الاستجابة: ${responseText.substring(0, 100)}`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('❌ خطأ في اختبار التقارير المالية:', error);
      toast({
        title: "خطأ",
        description: `فشل في تشغيل اختبار التقارير المالية: ${error.message}`,
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
        <TabsList className="grid w-full grid-cols-8">
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
          <TabsTrigger value="outstanding" className="gap-2">
            <Users className="h-4 w-4" />
            العملاء المدينون
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
                  <Button 
                    onClick={testFinancialReportWebhook}
                    variant="outline"
                    className="whitespace-nowrap"
                    disabled={loading}
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    اختبار التقارير المالية
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

        {/* Outstanding Balance Reports Webhooks */}
        <TabsContent value="outstanding">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                ويب هوك تقارير العملاء المدينين
              </CardTitle>
              <CardDescription>
                إضافة وإدارة ويب هوك لإرسال تقارير المبالغ المستحقة للعملاء المدينين
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <h4 className="font-medium mb-2 text-sm">📊 معلومات التقرير</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• يتم إرسال تقارير مفصلة عن حالة حسابات العملاء المدينين</li>
                    <li>• يشمل التقرير: رقم الطلب، المبلغ الإجمالي، المبلغ المدفوع، المتبقي</li>
                    <li>• يتم إرسال التقرير عبر واتساب للعميل مباشرة</li>
                    <li>• يمكن استخدام هذا الويب هوك من صفحة العملاء المدينين في لوحة الموظف</li>
                  </ul>
                </div>
                <WebhookManagement 
                  webhookSettings={webhookSettings.filter(w => w.webhook_type === 'outstanding_balance_report')}
                  onSave={saveWebhookSetting}
                  onUpdate={updateWebhookSetting}
                  onTest={testWebhook}
                  loading={loading}
                  webhookType="outstanding_balance_report"
                />
              </div>
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