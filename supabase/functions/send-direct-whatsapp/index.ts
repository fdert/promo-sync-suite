import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface DirectWhatsAppRequest {
  phone: string;
  message: string;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { headers: corsHeaders, status: 405 });
  }

  try {
    let body: DirectWhatsAppRequest;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON', details: e.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const phone = (body.phone || '').trim();
    const message = (body.message || '').trim();

    if (!phone || !message) {
      return new Response(JSON.stringify({ error: 'Phone and message are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize to E.164 and digits-only (for DB we store E.164)
    const raw = phone.replace(/\s+/g, '');
    const digitsOnly = raw.replace(/[^\d]/g, '');
    const toE164 = raw.startsWith('+') ? raw.replace(/[^\d+]/g, '') : `+${digitsOnly}`;

    // جلب webhook نشط من نوع outgoing
    const { data: webhookData } = await supabase
      .from('webhook_settings')
      .select('webhook_url, webhook_name')
      .eq('webhook_type', 'outgoing')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!webhookData?.webhook_url) {
      console.error('No active outgoing webhook found');
      return new Response(
        JSON.stringify({ success: false, error: 'No active webhook configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('Using webhook:', webhookData.webhook_name || 'Unknown');

    // Queue message first
    const { error: insertError, data: msgData } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: toE164,
        message_type: 'text',
        message_content: message,
        status: 'pending',
        is_reply: false,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error saving message record:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'DB insert failed', details: insertError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Message queued with ID:', msgData?.id);

    // إرسال فوري للـ webhook
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to: toE164.replace('+', ''),
        type: 'text',
        text: { body: message },
        phone: toE164,
        phoneNumber: toE164,
        message: message,
        messageText: message,
        notification_type: 'outstanding_balance',
        message_type: 'outstanding_balance',
        timestamp: Math.floor(Date.now() / 1000)
      };

      console.log('Sending to webhook:', webhookData.webhook_url);
      const webhookResponse = await fetch(webhookData.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseText = await webhookResponse.text();
      console.log('Webhook response status:', webhookResponse.status, 'body:', responseText);

      if (webhookResponse.ok) {
        // تحديث حالة الرسالة إلى sent
        await supabase
          .from('whatsapp_messages')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', msgData.id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            status: 'sent', 
            message_id: msgData.id,
            webhook_name: webhookData.webhook_name 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      } else {
        // فشل الإرسال
        await supabase
          .from('whatsapp_messages')
          .update({ 
            status: 'failed', 
            error_message: `Webhook failed: ${webhookResponse.status} - ${responseText}` 
          })
          .eq('id', msgData.id);

        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Webhook request failed',
            http_status: webhookResponse.status,
            response_body: responseText
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    } catch (webhookError: any) {
      console.error('Webhook error:', webhookError);
      
      // تحديث حالة الرسالة إلى failed
      await supabase
        .from('whatsapp_messages')
        .update({ 
          status: 'failed', 
          error_message: `Webhook error: ${webhookError.message}` 
        })
        .eq('id', msgData.id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Webhook error', 
          details: webhookError.message 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
  } catch (error: any) {
    console.error('General error in send-direct-whatsapp:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to queue WhatsApp', details: error?.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
