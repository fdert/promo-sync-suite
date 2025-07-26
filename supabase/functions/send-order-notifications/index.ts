import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { headers: corsHeaders, status: 405 });
  }

  try {
    const { type, data } = await req.json();
    console.log('Notification request:', { type, data });

    let message = '';
    let customerPhone = '';
    let customerName = '';

    // محاولة الحصول على قالب الرسالة من قاعدة البيانات
    const { data: templateData, error: templateError } = await supabase
      .from('message_templates')
      .select('template_content')
      .eq('template_name', type)
      .eq('is_active', true)
      .maybeSingle();

    if (templateData?.template_content) {
      console.log('Using template from database:', templateData.template_content);
      
      // استخدام القالب من قاعدة البيانات
      message = templateData.template_content;
      
      // استبدال المتغيرات
      const replacements: Record<string, string> = {
        'customer_name': data.customer_name || '',
        'order_number': data.order_number || '',
        'amount': data.amount?.toString() || '',
        'progress': data.progress?.toString() || '0',
        'service_name': data.service_name || '',
        'estimated_time': data.estimated_days || 'قريباً',
        'company_name': 'شركتنا'
      };

      // استبدال جميع المتغيرات في الرسالة
      Object.keys(replacements).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        message = message.replace(regex, replacements[key]);
      });

      customerPhone = data.customer_phone;
      customerName = data.customer_name;
    } else {
      console.log('No template found, using fallback messages');
      
      // الرسائل الافتراضية إذا لم توجد قوالب
      switch (type) {
        case 'order_created':
          message = `مرحباً ${data.customer_name}! تم إنشاء طلبك رقم ${data.order_number} بنجاح. قيمة الطلب: ${data.amount} ر.س. سيتم التواصل معك قريباً لتأكيد التفاصيل.`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        case 'order_confirmed':
          message = `${data.customer_name}، تم تأكيد طلبك رقم ${data.order_number}. بدأ العمل على مشروعك وسيتم إنجازه خلال ${data.estimated_days || 'قريباً'}.`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        case 'order_in_progress':
          message = `${data.customer_name}، طلبك رقم ${data.order_number} قيد التنفيذ حالياً. التقدم: ${data.progress || 0}%. سنبقيك على اطلاع بآخر التطورات.`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        case 'order_completed':
          message = `تهانينا ${data.customer_name}! تم إنجاز طلبك رقم ${data.order_number} بنجاح. يمكنك الآن مراجعة النتائج. نشكرك لثقتك بخدماتنا!`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        case 'order_cancelled':
          message = `عزيزي ${data.customer_name}، تم إلغاء طلبك رقم ${data.order_number}. للاستفسار يرجى التواصل معنا.`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        case 'invoice_created':
          message = `${data.customer_name}، تم إنشاء فاتورة رقم ${data.invoice_number} بقيمة ${data.total_amount} ر.س. تاريخ الاستحقاق: ${data.due_date}. يرجى المراجعة والدفع.`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        case 'invoice_paid':
          message = `شكراً لك ${data.customer_name}! تم استلام دفع فاتورة رقم ${data.invoice_number} بقيمة ${data.total_amount} ر.س بنجاح.`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        case 'invoice_overdue':
          message = `${data.customer_name}، فاتورة رقم ${data.invoice_number} متأخرة السداد. القيمة: ${data.total_amount} ر.س. يرجى الدفع في أقرب وقت لتجنب أي رسوم إضافية.`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        default:
          throw new Error(`Unknown notification type: ${type}`);
      }
    }

    if (!customerPhone || !message) {
      throw new Error('Missing customer phone or message content');
    }

    // البحث عن إعدادات الويب هوك للإرسال
    const { data: webhookSettings } = await supabase
      .from('webhook_settings')
      .select('webhook_url, order_statuses')
      .eq('webhook_type', 'outgoing')
      .eq('is_active', true);

    console.log('Found webhooks:', webhookSettings);

    // البحث عن webhook مناسب لهذا النوع من الإشعارات
    let selectedWebhook = null;
    
    if (webhookSettings && webhookSettings.length > 0) {
      // البحث عن webhook يحتوي على هذا النوع من الإشعارات أو webhook بدون تحديد حالات
      for (const webhook of webhookSettings) {
        if (!webhook.order_statuses || webhook.order_statuses.length === 0) {
          // webhook لجميع الحالات
          selectedWebhook = webhook;
          break;
        } else if (webhook.order_statuses.includes(type)) {
          // webhook مخصص لهذا النوع
          selectedWebhook = webhook;
          break;
        }
      }
    }

    if (!selectedWebhook?.webhook_url) {
      console.log('No matching webhook found for notification type:', type);
      throw new Error(`No active webhook configured for notification type: ${type}`);
    }

    // إعداد بيانات الرسالة للإرسال عبر n8n
    const messagePayload = {
      to: customerPhone,
      type: 'text',
      message: {
        text: message
      },
      timestamp: Math.floor(Date.now() / 1000),
      notification_type: type,
      customer_name: customerName
    };

    console.log('Sending notification via webhook:', JSON.stringify(messagePayload, null, 2));

    // إرسال الرسالة عبر webhook إلى n8n
    const response = await fetch(selectedWebhook.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload)
    });

    const responseData = await response.text();
    console.log('Webhook response:', responseData);

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${responseData}`);
    }

    // حفظ الرسالة المرسلة في قاعدة البيانات
    const { data: sentMessage, error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: customerPhone,
        message_type: 'text',
        message_content: message,
        status: 'sent',
        is_reply: false
      });

    if (messageError) {
      console.error('Error saving sent message:', messageError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully',
        type: type,
        customer_phone: customerPhone
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Notification error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send notification', 
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});