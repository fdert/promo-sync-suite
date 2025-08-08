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
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body:', requestBody);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { headers: corsHeaders, status: 400 }
      );
    }

    const { customer_phone, customer_name, message } = requestBody;

    if (!customer_phone || !message) {
      console.error('Missing required fields:', { customer_phone: !!customer_phone, message: !!message });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: customer_phone and message' }),
        { headers: corsHeaders, status: 400 }
      );
    }

    console.log(`Sending account summary to: ${customer_phone}`);
    console.log(`Customer: ${customer_name}`);

    // البحث عن إعدادات الويب هوك للإرسال (نفس منطق send-order-notifications)
    const { data: webhookSettings } = await supabase
      .from('webhook_settings')
      .select('webhook_url, order_statuses, webhook_name, webhook_type, is_active')
      .eq('is_active', true);

    console.log('Found webhooks:', webhookSettings);

    // البحث عن webhook مناسب
    let selectedWebhook = null;
    
    if (webhookSettings && webhookSettings.length > 0) {
      // البحث عن webhook نشط يدعم جميع الحالات أو outgoing
      for (const webhook of webhookSettings) {
        console.log('Checking webhook:', {
          name: webhook.webhook_name,
          type: webhook.webhook_type,
          active: webhook.is_active,
          statuses: webhook.order_statuses
        });
        
        if (!webhook.is_active) continue;
        
        if (webhook.webhook_type !== 'outgoing') continue;
        
        // webhook نشط من نوع outgoing
        selectedWebhook = webhook;
        console.log('Selected webhook:', webhook.webhook_name);
        break;
      }
      
      // إذا لم نجد outgoing، استخدم أي webhook نشط
      if (!selectedWebhook) {
        const activeWebhook = webhookSettings.find(w => w.is_active);
        if (activeWebhook) {
          selectedWebhook = activeWebhook;
          console.log('Using fallback webhook:', activeWebhook.webhook_name);
        }
      }
    }

    if (!selectedWebhook?.webhook_url) {
      console.log('No matching webhook found');
      return new Response(
        JSON.stringify({ error: 'No active webhook configured' }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // إعداد بيانات الرسالة للإرسال عبر n8n (نفس تنسيق send-order-notifications)
    const messagePayload = {
      // بيانات الواتساب للإرسال المباشر
      to: customer_phone,
      phone: customer_phone,
      phoneNumber: customer_phone,
      message: message,
      messageText: message,
      text: message,
      
      // معلومات العميل
      customer_name: customer_name,
      
      // معلومات نوع الإشعار
      notification_type: 'account_summary',
      type: 'account_summary',
      
      // البيانات الإضافية
      timestamp: Math.floor(Date.now() / 1000),
      company_name: 'وكالة الإبداع للدعاية والإعلان'
    };

    console.log('Sending message via webhook:', JSON.stringify(messagePayload, null, 2));

    // إرسال الرسالة عبر webhook إلى n8n
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
        to_number: customer_phone,
        message_type: 'text',
        message_content: message,
        status: messageStatus,
        is_reply: false,
      });

    if (messageError) {
      console.error('Error saving sent message:', messageError);
    }

    console.log(`Message processing completed with status: ${messageStatus}`);

    return new Response(
      JSON.stringify({ 
        success: messageStatus === 'sent',
        status: messageStatus,
        webhook_response: responseData,
        message: messageStatus === 'sent' ? 'تم إرسال الرسالة بنجاح' : 'فشل في إرسال الرسالة'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('General error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'فشل في إرسال ملخص الحساب',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});