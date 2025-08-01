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
    const { type, order_id, data } = await req.json();
    console.log('Notification request:', { type, order_id, data });

    let message = '';
    let customerPhone = '';
    let customerName = '';

    // جلب بيانات الطلب الكاملة مع بنود الطلب للطلبات الجديدة
    let orderDetails = null;
    if (type === 'order_created' && order_id) {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          customers(name, whatsapp_number),
          order_items(item_name, quantity, unit_price, total_amount, description)
        `)
        .eq('id', order_id)
        .single();
      
      if (!orderError && orderData) {
        orderDetails = orderData;
        console.log('Order details loaded:', orderDetails);
      }
    }

    // محاولة الحصول على قالب الرسالة من قاعدة البيانات
    const { data: templateData, error: templateError } = await supabase
      .from('message_templates')
      .select('template_content')
      .eq('template_type', type)
      .eq('is_active', true)
      .maybeSingle();

    if (templateData?.template_content) {
      console.log('Using template from database:', templateData.template_content);
      
      // استخدام القالب من قاعدة البيانات
      message = templateData.template_content;
      
      // إعداد المتغيرات للاستبدال
      let orderItemsText = '';
      let remainingAmount = '0';
      let startDate = 'سيتم تحديده';
      let dueDate = 'سيتم تحديده';
      let description = data.description || 'غير محدد';
      
      // إذا كانت هناك تفاصيل طلب، استخدمها
      if (orderDetails) {
        // تنسيق بنود الطلب
        if (orderDetails.order_items && orderDetails.order_items.length > 0) {
          orderItemsText = orderDetails.order_items.map((item: any, index: number) => 
            `${index + 1}. ${item.item_name}\n   الكمية: ${item.quantity}\n   السعر: ${item.unit_price} ر.س\n   المجموع: ${item.total_amount} ر.س${item.description ? `\n   الوصف: ${item.description}` : ''}`
          ).join('\n\n');
        } else {
          orderItemsText = 'لا توجد بنود محددة';
        }
        
        // حساب المبلغ المتبقي
        const totalAmount = parseFloat(orderDetails.amount?.toString() || '0');
        const paidAmount = parseFloat(orderDetails.paid_amount?.toString() || '0');
        remainingAmount = (totalAmount - paidAmount).toString();
        
        // تنسيق التواريخ
        if (orderDetails.start_date) {
          startDate = new Date(orderDetails.start_date).toLocaleDateString('ar-SA');
        }
        if (orderDetails.due_date) {
          dueDate = new Date(orderDetails.due_date).toLocaleDateString('ar-SA');
        }
        
        description = orderDetails.description || 'غير محدد';
        
        // استخدام بيانات من orderDetails
        customerPhone = orderDetails.customers?.whatsapp_number || data.customer_phone;
        customerName = orderDetails.customers?.name || data.customer_name;
      } else {
        // استخدام البيانات المرسلة مباشرة
        customerPhone = data.customer_phone;
        customerName = data.customer_name;
        
        // حساب المبلغ المتبقي من البيانات المرسلة
        const totalAmount = parseFloat(data.amount?.toString() || '0');
        const paidAmount = parseFloat(data.paid_amount?.toString() || '0');
        remainingAmount = (totalAmount - paidAmount).toString();
      }
      
      // استبدال المتغيرات
      const replacements: Record<string, string> = {
        'customer_name': customerName || '',
        'order_number': data.order_number || '',
        'amount': data.amount?.toString() || '',
        'paid_amount': data.paid_amount?.toString() || '0',
        'remaining_amount': remainingAmount,
        'payment_type': data.payment_type || 'غير محدد',
        'progress': data.progress?.toString() || '0',
        'service_name': data.service_name || '',
        'description': description,
        'order_items': orderItemsText,
        'start_date': startDate,
        'due_date': dueDate,
        'status': data.status || 'جديد',
        'priority': data.priority || 'متوسطة',
        'estimated_time': data.estimated_days || 'قريباً',
        'company_name': 'شركتنا',
        'evaluation_link': `https://e5a7747a-0935-46df-9ea9-1308e76636dc.lovableproject.com/evaluation/${data.evaluation_token}`
      };

      // استبدال جميع المتغيرات في الرسالة
      Object.keys(replacements).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        message = message.replace(regex, replacements[key]);
      });
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

        case 'order_ready_for_delivery':
          message = `${data.customer_name}، طلبك رقم ${data.order_number} جاهز للتسليم! يرجى تقييم الخدمة: https://gcuqfxacnbxdldsbmgvf.supabase.co/evaluation/${data.evaluation_token}`;
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
      
      // إذا لم نجد webhook مخصص، نستخدم الأول المتوفر
      if (!selectedWebhook && webhookSettings.length > 0) {
        selectedWebhook = webhookSettings[0];
        console.log('Using first available webhook as fallback');
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