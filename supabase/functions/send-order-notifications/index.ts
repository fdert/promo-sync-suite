import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle CORS preflight requests
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Function started successfully');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody = await req.json();
    console.log('Request body parsed:', requestBody);

    const { type, order_id, data, source = 'unknown', webhook_preference = null } = requestBody;
    
    console.log('Notification request:', { type, order_id, data });

    // إذا لم يكن هناك order_id، استخدم البيانات المرسلة مباشرة
    if (!order_id && !data) {
      throw new Error('Missing order_id or data');
    }

    const orderId = order_id || data?.order_id;
    
    // الحصول على قالب الرسالة من قاعدة البيانات
    const { data: templateData } = await supabase
      .from('message_templates')
      .select('template_content')
      .eq('template_name', type)
      .eq('is_active', true)
      .single();

    let messageTemplate = '';
    
    if (templateData?.template_content) {
      messageTemplate = templateData.template_content;
      console.log('Using template from database:', messageTemplate);
    } else {
      // قالب افتراضي للرسائل
      switch (type) {
        case 'order_completed':
          messageTemplate = `مرحباً {{customer_name}}! 🎉

✅ *طلبك تم تسليمه واكتماله !*

📋 *تفاصيل الطلب:*
رقم الطلب: {{order_number}}
الخدمة: {{service_name}}
الوصف: {{description}}
الحالة: {{status}}

💰 *المعلومات المالية:*
إجمالي المبلغ: {{amount}} ر.س
المبلغ المدفوع: {{paid_amount}} ر.س
المبلغ المتبقي: {{remaining_amount}} ر.س

📦 *بنود الطلب:*
{{order_items}}

📅 تاريخ التسليم: {{due_date}}

نشكرك لثقتك الغالية بخدماتنا ونتطلع لخدمتك مرة أخرى! 💕

🌟 *نرجو تقييم خدمتنا:*
{{evaluation_link}}

شكراً لاختيارك خدماتنا! 🙏`;
          break;
        case 'order_ready_for_delivery':
          messageTemplate = `مرحباً {{customer_name}}! 🎉

✅ *طلبك جاهز للتسليم!*

📋 *تفاصيل الطلب:*
رقم الطلب: {{order_number}}
الخدمة: {{service_name}}
الوصف: {{description}}

💰 *المعلومات المالية:*
إجمالي المبلغ: {{amount}} ر.س
المبلغ المدفوع: {{paid_amount}} ر.س
المبلغ المتبقي: {{remaining_amount}} ر.س

يمكنكم استلام طلبكم من مقرنا أو سيتم توصيله إليكم قريباً.

شكراً لاختيارك خدماتنا! 🙏`;
          break;
        default:
          messageTemplate = `مرحباً {{customer_name}}!

تم تحديث حالة طلبكم رقم {{order_number}} إلى: {{status}}

شكراً لاختيارك خدماتنا! 🙏`;
      }
    }

    // تهيئة المتغيرات
    let message = '';
    let customerPhone = '';
    let customerName = '';
    let remainingAmount = '0';
    let orderItemsText = '';
    let startDate = 'سيتم تحديده';
    let dueDate = 'سيتم تحديده';
    let companyName = 'وكالة الإبداع للدعاية والإعلان';
    let actualPaidAmount = 0;
    let totalAmount = 0;
    let description = 'غير محدد';

    // إذا كان هناك order_id، جلب تفاصيل الطلب من قاعدة البيانات
    if (orderId) {
      const { data: orderDetails } = await supabase
        .from('orders')
        .select(`
          id, order_number, customer_id, service_name, description, 
          status, priority, amount, progress, start_date, due_date,
          payment_type, created_at, updated_at,
          customers!inner (name, whatsapp_number),
          order_items (quantity, item_name, unit_price, description, total_amount)
        `)
        .eq('id', orderId)
        .single();

      console.log('Order details loaded:', orderDetails);

      if (orderDetails) {
        // حساب المبلغ المدفوع الفعلي من جدول المدفوعات
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('amount')
          .eq('order_id', orderId);
        
        console.log('=== Payment Calculation Debug ===');
        console.log('Order ID:', orderId);
        console.log('Payments Data:', paymentsData);
        console.log('Payments Error:', paymentsError);
        
        if (!paymentsError && paymentsData && paymentsData.length > 0) {
          actualPaidAmount = paymentsData.reduce((sum: number, payment: any) => {
            const amount = parseFloat(payment.amount?.toString() || '0');
            console.log('Adding payment amount:', amount);
            return sum + amount;
          }, 0);
        }
        
        console.log('=== Final Calculated Amount ===');
        console.log('Total Paid Amount:', actualPaidAmount);

        // إعداد البيانات من تفاصيل الطلب
        totalAmount = parseFloat(orderDetails.amount?.toString() || '0');
        
        // حساب المبلغ المتبقي
        remainingAmount = (totalAmount - actualPaidAmount).toString();
        
        // تنسيق التواريخ
        if (orderDetails.start_date) {
          startDate = new Date(orderDetails.start_date).toLocaleDateString('ar-SA');
        }
        if (orderDetails.due_date) {
          dueDate = new Date(orderDetails.due_date).toLocaleDateString('ar-SA');
        }
        
        description = orderDetails.description || 'غير محدد';
        customerPhone = orderDetails.customers?.whatsapp_number || data?.customer_phone || '';
        customerName = orderDetails.customers?.name || data?.customer_name || '';

        // تنسيق بنود الطلب
        if (orderDetails.order_items && orderDetails.order_items.length > 0) {
          orderItemsText = orderDetails.order_items.map((item: any, index: number) => {
            return `${index + 1}. ${item.item_name} 
   الكمية: ${item.quantity}
   السعر: ${item.unit_price} ر.س
   المجموع: ${item.total_amount} ر.س`;
          }).join('\n\n');
        }
        
        console.log('Order items formatted:', orderItemsText);
      }
    } else {
      // استخدام البيانات المرسلة مباشرة
      customerPhone = data?.customer_phone || '';
      customerName = data?.customer_name || '';
      totalAmount = parseFloat(data?.amount?.toString() || '0');
      actualPaidAmount = parseFloat(data?.paid_amount?.toString() || '0');
      remainingAmount = (totalAmount - actualPaidAmount).toString();
    }

    console.log('=== Final Values for Message ===');
    console.log('Total Amount:', totalAmount);
    console.log('Actual Paid Amount:', actualPaidAmount);
    console.log('Remaining Amount:', remainingAmount);

    // استبدال المتغيرات في قالب الرسالة
    const replacements: Record<string, string> = {
      'customer_name': customerName || '',
      'order_number': data?.order_number || '',
      'amount': totalAmount.toString(),
      'paid_amount': actualPaidAmount.toString(),
      'remaining_amount': remainingAmount,
      'payment_type': data?.payment_type || 'غير محدد',
      'service_name': data?.service_name || '',
      'description': description,
      'status': data?.new_status || data?.status || '',
      'priority': data?.priority || 'متوسطة',
      'start_date': startDate,
      'due_date': dueDate,
      'order_items': orderItemsText,
      'evaluation_link': `https://e5a7747a-0935-46df-9ea9-1308e76636dc.lovableproject.com/evaluation/token-${orderId}`,
      'company_name': companyName,
      'estimated_time': data?.estimated_days || 'قريباً',
      'progress': data?.progress?.toString() || '0',
      'date': new Date().toLocaleDateString('ar-SA')
    };

    // استبدال جميع المتغيرات في النص
    message = messageTemplate;
    Object.entries(replacements).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      message = message.replace(regex, value);
    });

    // التحقق من وجود webhooks نشطة
    const { data: webhooks } = await supabase
      .from('webhook_settings')
      .select('webhook_url, order_statuses, webhook_name, webhook_type, is_active')
      .eq('is_active', true);

    console.log('Found webhooks:', webhooks);

    if (webhooks && webhooks.length > 0) {
      console.log('Available webhooks:', webhooks.map(w => ({
        name: w.webhook_name,
        type: w.webhook_type,
        active: w.is_active,
        statuses: w.order_statuses
      })));

      // البحث عن webhook مناسب لنوع الإشعار
      console.log('Looking for webhook with type:', type);

      // إعداد بيانات الرسالة
      const messagePayload = {
        customer_name: customerName,
        order_number: data?.order_number || '',
        service_name: data?.service_name || '',
        description: description,
        amount: totalAmount.toString(),
        paid_amount: actualPaidAmount.toString(),
        remaining_amount: remainingAmount,
        payment_type: data?.payment_type || 'غير محدد',
        status: data?.new_status || data?.status || '',
        priority: data?.priority || 'متوسطة',
        start_date: startDate,
        due_date: dueDate,
        order_items: orderItemsText,
        evaluation_link: `https://e5a7747a-0935-46df-9ea9-1308e76636dc.lovableproject.com/evaluation/token-${orderId}`,
        company_name: companyName,
        estimated_time: data?.estimated_days || 'قريباً',
        progress: data?.progress?.toString() || '0',
        date: new Date().toLocaleDateString('ar-SA'),
        
        // بيانات الواتساب للإرسال المباشر
        to: customerPhone,
        phone: customerPhone,
        phoneNumber: customerPhone,
        message: message,
        messageText: message,
        text: message,
        
        // معلومات نوع الإشعار
        notification_type: type,
        type: type,
        timestamp: Math.floor(Date.now() / 1000),
        order_id: orderId
      };

      // إرسال إلى webhooks المناسبة
      for (const webhook of webhooks) {
        console.log('Checking webhook:', {
          name: webhook.webhook_name,
          type: webhook.webhook_type,
          active: webhook.is_active,
          statuses: webhook.order_statuses
        });

        // فلترة الـ webhooks حسب النوع
        if (webhook.webhook_type !== 'outgoing') {
          console.log('Webhook type is not outgoing:', webhook.webhook_type);
          continue;
        }

        // فلترة حسب webhook_preference إذا كان محدد
        if (webhook_preference && webhook.webhook_name !== webhook_preference) {
          console.log(`Skipping webhook ${webhook.webhook_name}, preference is ${webhook_preference}`);
          continue;
        }

        // التحقق من الحالات المدعومة
        if (webhook.order_statuses && webhook.order_statuses.length > 0) {
          console.log(`Checking if webhook contains status: ${type} in:`, webhook.order_statuses);
          if (!webhook.order_statuses.includes(type)) {
            console.log(`Webhook ${webhook.webhook_name} does not support status ${type}`);
            continue;
          }
        }

        console.log('Found matching webhook for type:', type);

        try {
          console.log('Sending notification via webhook:', messagePayload);
          
          const webhookResponse = await fetch(webhook.webhook_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(messagePayload)
          });

          console.log('Webhook response status:', webhookResponse.status);
          
          if (webhookResponse.ok) {
            const responseData = await webhookResponse.text();
            console.log('Webhook response data:', responseData);
            console.log('Webhook sent successfully');
          } else {
            console.error('Webhook failed with status:', webhookResponse.status);
          }
        } catch (error) {
          console.error('Error sending webhook:', error);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully',
        type: type,
        customer_phone: customerPhone
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-order-notifications:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});