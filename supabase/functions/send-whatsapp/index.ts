import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// إنشاء عميل Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const whatsSenderApiKey = Deno.env.get('WHATS_SENDER_API_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      headers: corsHeaders,
      status: 405
    });
  }

  try {
    // التحقق من المصادقة
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', {
        headers: corsHeaders,
        status: 401
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response('Unauthorized', {
        headers: corsHeaders,
        status: 401
      });
    }

    const body = await req.json();
    const { to_number, message_content, message_type = 'text', webhook_url } = body;

    if (!to_number || !message_content) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to_number, message_content' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // التحقق من وجود API key لـ whats-sender
    if (!whatsSenderApiKey) {
      return new Response(
        JSON.stringify({ error: 'WHATS_SENDER_API_KEY not configured in secrets' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    // إعداد بيانات الرسالة للإرسال عبر whats-sender API
    const messagePayload = {
      number: to_number,
      message: message_content,
      type: message_type
    };

    console.log('Sending message via whats-sender API:', JSON.stringify(messagePayload, null, 2));

    // إرسال الرسالة عبر whats-sender API
    const response = await fetch('https://api.whats-sender.com/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${whatsSenderApiKey}`,
      },
      body: JSON.stringify(messagePayload)
    });

    const responseData = await response.text();
    console.log('Whats-sender API response:', responseData);

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${responseData}`);
    }

    // حفظ الرسالة المرسلة في قاعدة البيانات
    const { data: sentMessage, error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system', // أو رقم الأعمال
        to_number: to_number,
        message_type: message_type,
        message_content: message_content,
        status: 'sent',
        is_reply: true,
        replied_by: user.id,
        replied_at: new Date().toISOString()
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error saving sent message:', messageError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Message sent successfully',
        message_id: sentMessage?.id,
        webhook_response: responseData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Send message error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send message', 
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});