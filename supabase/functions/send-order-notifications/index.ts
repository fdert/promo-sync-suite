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
    console.log('Function started successfully');
    
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body parsed:', requestBody);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body', details: parseError.message }),
        { headers: corsHeaders, status: 400 }
      );
    }

    const { type, order_id, data, source, webhook_preference } = requestBody;
    console.log('Notification request:', { type, order_id, data, source, webhook_preference });

    if (!type) {
      console.error('Missing required field: type');
      return new Response(
        JSON.stringify({ error: 'Missing required field: type' }),
        { headers: corsHeaders, status: 400 }
      );
    }
    
    // For account_summary, we don't need order_id, just customer info
    if (type === 'account_summary') {
      if (!requestBody.customer_phone) {
        console.error('Missing customer_phone for account_summary');
        return new Response(
          JSON.stringify({ error: 'Missing customer_phone for account_summary' }),
          { headers: corsHeaders, status: 400 }
        );
      }
    } else {
      // For other notification types, we need order_id
      if (!order_id) {
        console.error('Missing required field: order_id');
        return new Response(
          JSON.stringify({ error: 'Missing required field: order_id' }),
          { headers: corsHeaders, status: 400 }
        );
      }
    }

    let message = '';
    let customerPhone = '';
    let customerName = '';
    let remainingAmount = '0';
    let orderItemsText = '';
    let startDate = 'سيتم تحديده';
    let dueDate = 'سيتم تحديده';
    let companyName = 'وكالة الإبداع للدعاية والإعلان';

    // جلب اسم الشركة من قاعدة البيانات
    try {
      const { data: companyData } = await supabase
        .from('website_settings')
        .select('setting_value')
        .eq('setting_key', 'company_info')
        .maybeSingle();

      if (companyData?.setting_value?.companyName) {
        companyName = companyData.setting_value.companyName;
      }
    } catch (error) {
      console.log('Could not fetch company name, using default');
    }

    // جلب بيانات الطلب الكاملة مع بنود الطلب لجميع أنواع الإشعارات
    let orderDetails = null;
    if (order_id) {
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

    // تنسيق بنود الطلب أولاً (سواء كان هناك template أم لا)
    if (orderDetails) {
      if (orderDetails.order_items && orderDetails.order_items.length > 0) {
        orderItemsText = orderDetails.order_items.map((item: any, index: number) => 
          `${index + 1}. ${item.item_name} \n   الكمية: ${item.quantity}\n   السعر: ${item.unit_price} ر.س\n   المجموع: ${item.total_amount} ر.س`
        ).join('\n\n');
        console.log('Order items formatted:', orderItemsText);
      } else {
        orderItemsText = 'لا توجد بنود محددة';
        console.log('No order items found');
      }
    }

    // تحديد اسم القالب المناسب حسب نوع الإشعار وحالة الطلب
    let templateName = type;
    
    // ربط أنواع الإشعارات وحالات الطلب بأسماء القوالب
    // استخدام الحالة الجديدة من البيانات المرسلة أولاً، ثم الحالة من قاعدة البيانات
    const currentStatus = data.new_status || orderDetails?.status || data.status;
    if (currentStatus) {
      switch (currentStatus) {
        case 'جديد':
          templateName = 'order_created';
          break;
        case 'مؤكد':
          templateName = 'order_confirmed';
          break;
        case 'قيد التنفيذ':
          templateName = 'order_in_progress';
          break;
        case 'قيد المراجعة':
          templateName = 'order_under_review';
          break;
        case 'جاهز للتسليم':
          templateName = 'order_ready_for_delivery';
          break;
        case 'مكتمل':
          templateName = 'order_completed';
          break;
        case 'ملغي':
          templateName = 'order_cancelled';
          break;
        case 'قيد الانتظار':
          templateName = 'order_on_hold';
          break;
        default:
          // استخدام نوع الإشعار إذا لم تطابق أي حالة
          switch (type) {
            case 'order_created':
            case 'order_confirmed':
            case 'order_in_progress':
            case 'order_under_review':
            case 'order_ready_for_delivery':
            case 'order_completed':
            case 'order_cancelled':
            case 'order_on_hold':
              templateName = type;
              break;
            case 'design_proof_sent':
              templateName = 'design_proof_ready';
              break;
            default:
              templateName = 'order_status_updated';
              break;
          }
      }
    } else {
      // إذا لم توجد بيانات الطلب، استخدم نوع الإشعار مباشرة
      switch (type) {
        case 'design_proof_sent':
          templateName = 'design_proof_ready';
          break;
        case 'order_created':
        case 'order_confirmed':
        case 'order_in_progress':
        case 'order_under_review':
        case 'order_ready_for_delivery':
        case 'order_completed':
        case 'order_cancelled':
        case 'order_on_hold':
          templateName = type;
          break;
        case 'account_summary':
          // للرسائل المباشرة (ملخص الحساب)، لا نحتاج قالب
          templateName = null;
          break;
        default:
          templateName = 'order_status_updated';
          break;
      }
    }
    
    console.log('Using template name:', templateName);

    // محاولة الحصول على قالب الرسالة من قاعدة البيانات (فقط إذا لم تكن رسالة مباشرة)
    if (templateName) {
      const { data: templateData, error: templateError } = await supabase
        .from('message_templates')
        .select('template_content')
        .eq('template_name', templateName)
        .eq('is_active', true)
        .maybeSingle();

      if (templateData?.template_content) {
        console.log('Using template from database:', templateData.template_content);
      
      // استخدام القالب من قاعدة البيانات
      message = templateData.template_content;
      
      // إذا كانت هناك تفاصيل طلب، استخدمها
      let description = 'غير محدد';
      if (orderDetails) {
        
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
        'status': data.new_status || data.status || orderDetails?.status || currentStatus || 'جديد',
        'priority': data.priority || 'متوسطة',
         'estimated_time': data.estimated_days || 'قريباً',
         'company_name': companyName,
         'evaluation_link': `https://e5a7747a-0935-46df-9ea9-1308e76636dc.lovableproject.com/evaluation/token-${order_id}`
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
          message = `مرحباً ${data.customer_name}! تم إنشاء طلبك رقم ${data.order_number} بنجاح. 

📋 تفاصيل الطلب:
الخدمة: ${data.service_name}
الوصف: ${data.description || 'غير محدد'}
قيمة الطلب: ${data.amount} ر.س

📦 بنود الطلب:
${orderItemsText || 'لا توجد بنود محددة'}

سيتم التواصل معك قريباً لتأكيد التفاصيل. شكراً لثقتك بخدماتنا!`;
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

        case 'order_updated':
          message = `${data.customer_name}، تم تحديث طلبك رقم ${data.order_number}. الحالة الحالية: ${data.status}. سنبقيك على اطلاع بأي تطورات جديدة.`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        case 'order_cancelled':
          message = `عزيزي ${data.customer_name}، تم إلغاء طلبك رقم ${data.order_number}. للاستفسار يرجى التواصل معنا.`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        case 'order_ready_for_delivery':
          message = `${data.customer_name}، طلبك رقم ${data.order_number} جاهز للتسليم! لتقييم الخدمة يرجى الضغط هنا: ${data.evaluation_link}`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        case 'status_update':
          message = `${data.customer_name}، تم تحديث حالة طلبك رقم ${data.order_number} من "${data.old_status}" إلى "${data.new_status}". سنبقيك على اطلاع بأي تطورات جديدة.`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        case 'order_under_review':
          message = `${data.customer_name}، طلبك رقم ${data.order_number} قيد المراجعة حالياً. سيتم التواصل معك قريباً لتأكيد التفاصيل.`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        case 'design_proof':
          message = `🎨 *بروفة التصميم جاهزة للمراجعة*

📋 *تفاصيل الطلب:*
• رقم الطلب: ${data.order_number}
• العميل: ${data.customer_name}
• الخدمة: ${data.service_name}
${data.order_items_text || ''}

📸 *لاستعراض البروفة:*
👇 اضغط على الرابط التالي لعرض التصميم:
${data.file_url}

*بعد مراجعة البروفة:*

✅ *للموافقة:* أرسل "موافق"
📝 *للتعديل:* اكتب التعديلات المطلوبة

شكراً لكم،
فريق *${data.company_name || 'وكالة الإبداع للدعاية والإعلان'}*`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        case 'account_summary':
          message = requestBody.message || 'ملخص الحساب';
          customerPhone = requestBody.customer_phone;
          customerName = requestBody.customer_name;
          break;

        default:
          // للحصول على بيانات الطلب إذا كان متوفراً
          if (orderDetails) {
            customerPhone = orderDetails.customers?.whatsapp_number || '';
            customerName = orderDetails.customers?.name || 'عزيزنا العميل';
          }
          break;
      }
    } else {
      // معالجة الحالات الخاصة عندما لا يوجد قالب
      switch (type) {
        case 'account_summary':
          message = requestBody.message || 'ملخص الحساب';
          customerPhone = requestBody.customer_phone;
          customerName = requestBody.customer_name;
          break;
          
        default:
          throw new Error(`Unknown notification type: ${type}`);
      }
    }
    
    // التحقق من أن البيانات مكتملة
    console.log('Final values before sending:', { 
      customerPhone, 
      customerName, 
      messageLength: message.length,
      type 
    });

    if (!customerPhone || !message) {
      console.error('Missing data:', { 
        hasCustomerPhone: !!customerPhone, 
        hasMessage: !!message,
        customerPhone,
        messagePreview: message.substring(0, 100)
      });
      return new Response(
        JSON.stringify({ 
          error: 'Missing customer phone or message content',
          details: { hasCustomerPhone: !!customerPhone, hasMessage: !!message }
        }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // البحث عن إعدادات الويب هوك للإرسال
    const { data: webhookSettings } = await supabase
      .from('webhook_settings')
      .select('webhook_url, order_statuses, webhook_name, webhook_type, is_active')
      .eq('is_active', true);

    console.log('Found webhooks:', webhookSettings);

    // البحث عن webhook مناسب لهذا النوع من الإشعارات
    let selectedWebhook = null;
    
    if (webhookSettings && webhookSettings.length > 0) {
      console.log('Looking for webhook with type:', type);
      console.log('Webhook preference:', webhook_preference);
      console.log('Source:', source);
      console.log('Available webhooks:', webhookSettings.map(w => ({
        name: w.webhook_name,
        type: w.webhook_type,
        active: w.is_active,
        statuses: w.order_statuses
      })));
      
      // إذا كان هناك webhook مفضل محدد، ابحث عنه أولاً
      if (webhook_preference) {
        const preferredWebhook = webhookSettings.find(w => 
          w.is_active && 
          w.webhook_type === 'outgoing' && 
          w.webhook_name === webhook_preference
        );
        
        if (preferredWebhook) {
          // تحقق من دعم نوع الإشعار
          if (!preferredWebhook.order_statuses || 
              preferredWebhook.order_statuses.length === 0 || 
              preferredWebhook.order_statuses.includes(type)) {
            selectedWebhook = preferredWebhook;
            console.log('Using preferred webhook:', webhook_preference);
          }
        }
      }
      
      // إذا لم نجد الويب هوك المفضل، ابحث عن أي webhook مناسب
      if (!selectedWebhook) {
        console.log('Preferred webhook not found or not suitable, searching for alternative');
        
        // البحث عن webhook نشط يحتوي على هذا النوع من الإشعارات
        for (const webhook of webhookSettings) {
        console.log('Checking webhook:', {
          name: webhook.webhook_name,
          type: webhook.webhook_type,
          active: webhook.is_active,
          statuses: webhook.order_statuses
        });
        
        // تأكد من أن الـ webhook نشط أولاً
        if (!webhook.is_active) {
          console.log('Webhook not active, skipping');
          continue;
        }
        
        // تحقق من webhook_type أولاً - نريد 'outgoing' للإشعارات
        if (webhook.webhook_type !== 'outgoing') {
          console.log('Webhook type is not outgoing:', webhook.webhook_type);
          continue;
        }
        
        // تحقق من order_statuses
        if (!webhook.order_statuses || webhook.order_statuses.length === 0) {
          // webhook لجميع الحالات
          selectedWebhook = webhook;
          console.log('Using webhook for all statuses');
          break;
        } else {
          console.log('Checking if webhook contains status:', type, 'in:', webhook.order_statuses);
          if (Array.isArray(webhook.order_statuses) && webhook.order_statuses.includes(type)) {
            // webhook مخصص لهذا النوع
            selectedWebhook = webhook;
            console.log('Found matching webhook for type:', type);
            break;
          }
        }
      }
      
      // إذا لم نجد webhook مخصص، نستخدم أول webhook نشط من نوع outgoing
      if (!selectedWebhook) {
        console.log('No specific webhook found, looking for fallback');
        const activeWebhook = webhookSettings.find(w => w.is_active && w.webhook_type === 'outgoing');
        if (activeWebhook) {
          selectedWebhook = activeWebhook;
          console.log('Using first active outgoing webhook as fallback');
        }
      }
    }

    if (!selectedWebhook?.webhook_url) {
      console.log('No matching webhook found for notification type:', type);
      // بدلاً من رمي خطأ، سنحاول الإرسال مع webhook افتراضي إذا وجد
      if (webhookSettings && webhookSettings.length > 0) {
        selectedWebhook = webhookSettings[0];
        console.log('Using first available webhook as last resort');
      } else {
        throw new Error(`No active webhook configured for notification type: ${type}`);
      }
    }

    // إعداد بيانات الرسالة للإرسال عبر n8n كمتغيرات منفصلة في الجذر
    const messagePayload = {
      // متغيرات قوالب الرسائل - يمكن الوصول إليها مباشرة في n8n
      customer_name: customerName,
      order_number: data.order_number || '',
      service_name: data.service_name || '',
      description: orderDetails?.description || data.description || 'غير محدد',
      amount: data.amount?.toString() || '0',
      paid_amount: data.paid_amount?.toString() || '0',
      remaining_amount: remainingAmount,
      payment_type: data.payment_type || 'غير محدد',
      status: data.new_status || data.status || orderDetails?.status || currentStatus || '',
      priority: data.priority || 'متوسطة',
      start_date: startDate,
      due_date: dueDate,
      order_items: orderItemsText,
      evaluation_link: `https://e5a7747a-0935-46df-9ea9-1308e76636dc.lovableproject.com/evaluation/token-${order_id}`,
      company_name: companyName,
      estimated_time: data.estimated_days || 'قريباً',
      progress: data.progress?.toString() || '0',
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
      
      // البيانات الإضافية
      timestamp: Math.floor(Date.now() / 1000),
      order_id: order_id
    };

    console.log('Sending notification via webhook:', JSON.stringify(messagePayload, null, 2));

    // إرسال الرسالة عبر webhook إلى n8n مع headers صحيحة وإعادة المحاولة
    let response;
    let responseData;
    let messageStatus = 'failed';
    
    try {
      response = await fetch(selectedWebhook.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Supabase-Functions'
        },
        body: JSON.stringify(messagePayload),
        // إضافة timeout لتجنب انتظار طويل
        signal: AbortSignal.timeout(30000) // 30 ثانية
      });

      try {
        responseData = await response.text();
        console.log('Webhook response status:', response.status);
        console.log('Webhook response data:', responseData);
      } catch (e) {
        responseData = 'Failed to read response';
        console.log('Failed to read webhook response:', e);
      }

      // تحديد حالة الرسالة حسب نجاح أو فشل الويب هوك
      if (response.ok && response.status >= 200 && response.status < 300) {
        console.log('Webhook sent successfully');
        messageStatus = 'sent';
      } else {
        console.error(`Webhook failed with status: ${response.status}`);
        console.error(`Webhook response: ${responseData}`);
        messageStatus = 'failed';
      }
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      messageStatus = 'failed';
      responseData = `Fetch error: ${fetchError.message}`;
    }

    // حفظ الرسالة المرسلة في قاعدة البيانات
    const { data: sentMessage, error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: customerPhone,
        message_type: 'text',
        message_content: message,
        status: messageStatus, // سيكون sent أو failed حسب استجابة الويب هوك
        is_reply: false,
        customer_id: orderDetails?.customers?.id || null
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