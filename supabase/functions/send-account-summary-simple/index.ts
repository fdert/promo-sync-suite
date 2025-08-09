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
    const requestBody = await req.json();
    console.log('Request body:', requestBody);

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

    // البحث عن إعدادات الويب هوك النشطة
    const { data: webhookSettings } = await supabase
      .from('webhook_settings')
      .select('webhook_url, webhook_name, webhook_type, is_active')
      .eq('is_active', true);

    console.log('Found active webhooks:', webhookSettings);

    // البحث عن webhook مناسب
    let selectedWebhook = null;
    
    if (webhookSettings && webhookSettings.length > 0) {
      // البحث عن webhook نشط من نوع outgoing أولاً
      for (const webhook of webhookSettings) {
        if (webhook.is_active && webhook.webhook_type === 'outgoing') {
          selectedWebhook = webhook;
          console.log('Selected outgoing webhook:', webhook.webhook_name);
          break;
        }
      }
      
      // إذا لم نجد outgoing، استخدم أي webhook نشط
      if (!selectedWebhook) {
        selectedWebhook = webhookSettings.find(w => w.is_active);
        if (selectedWebhook) {
          console.log('Using fallback webhook:', selectedWebhook.webhook_name);
        }
      }
    }

    if (!selectedWebhook?.webhook_url) {
      console.log('No active webhook found');
      return new Response(
        JSON.stringify({ error: 'No active webhook configured' }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // إعداد بيانات الرسالة للإرسال
    const messagePayload = {
      to: customer_phone,
      phone: customer_phone,
      phoneNumber: customer_phone,
      message: message,
      messageText: message,
      text: message,
      customer_name: customer_name,
      notification_type: 'account_summary',
      type: 'account_summary',
      timestamp: Math.floor(Date.now() / 1000),
      company_name: 'وكالة الإبداع للدعاية والإعلان'
    };

    console.log('Sending message via webhook:', JSON.stringify(messagePayload, null, 2));

    // إرسال الرسالة عبر webhook
    const response = await fetch(selectedWebhook.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Supabase-Functions'
      },
      body: JSON.stringify(messagePayload),
      signal: AbortSignal.timeout(30000)
    });

    let responseData = '';
    try {
      responseData = await response.text();
      console.log('Webhook response status:', response.status);
      console.log('Webhook response data:', responseData);
    } catch (e) {
      responseData = 'Failed to read response';
      console.log('Failed to read webhook response:', e);
    }

    const messageStatus = response.ok ? 'sent' : 'failed';

    // حفظ الرسالة في قاعدة البيانات
    const { error: messageError } = await supabase
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
      console.error('Error saving message:', messageError);
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