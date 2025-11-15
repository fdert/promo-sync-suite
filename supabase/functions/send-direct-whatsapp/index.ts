import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Fetch all active webhooks (reuse same selection logic as send-order-notifications)
    const { data: webhooks, error: whError } = await supabase
      .from('webhook_settings')
      .select('webhook_url, order_statuses, webhook_name, webhook_type, is_active')
      .eq('is_active', true);

    if (whError) {
      console.error('Error fetching webhooks:', whError);
    }

    let selected = null as any;
    if (webhooks && webhooks.length > 0) {
      // Prefer outgoing without restrictions, then any outgoing, then bulk_campaign, then first
      selected = webhooks.find(w => w.is_active && w.webhook_type === 'outgoing' && (!w.order_statuses || w.order_statuses.length === 0))
        || webhooks.find(w => w.is_active && w.webhook_type === 'outgoing')
        || webhooks.find(w => w.is_active && w.webhook_type === 'bulk_campaign')
        || webhooks[0];
    }

    console.log('Selected webhook:', {
      name: selected?.webhook_name,
      type: selected?.webhook_type,
      hasUrl: !!selected?.webhook_url,
    });

    if (!selected?.webhook_url) {
      // Return 200 but indicate failure in payload to avoid SDK generic error popup
      return new Response(JSON.stringify({ success: false, error: 'No active webhook configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Normalize phone number to E.164 and provide both digits-only and E.164 variants
    const raw = phone.replace(/\s+/g, '');
    const digitsOnly = raw.replace(/[^\d]/g, '');
    const toE164 = raw.startsWith('+') ? raw.replace(/[^\d+]/g, '') : `+${digitsOnly}`;
    const toDigits = toE164.replace(/\D/g, '');

    // Build payload compatible with WhatsApp webhook and legacy n8n flows
    const messagePayload: Record<string, any> = {
      // WhatsApp-style fields
      messaging_product: 'whatsapp',
      to: toDigits,              // many n8n nodes expect digits-only here
      to_e164: toE164,           // provide E.164 as well for newer flows
      type: 'text',
      text: { body: message },

      // Legacy/general fields for existing n8n workflows
      phone: toE164,
      phoneNumber: toE164,
      phone_number: toE164,
      to_number: toE164,
      to_digits: toDigits,
      message,
      messageText: message,
      notification_type: 'direct_message',
      message_type: 'direct_message',
      timestamp: Math.floor(Date.now() / 1000),
    };

    console.log('Sending direct WhatsApp via webhook:', JSON.stringify(messagePayload, null, 2));

    let response;
    let responseData: string | undefined;
    let webhookOk = false;

    try {
      response = await fetch(selected.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Supabase-Functions'
        },
        body: JSON.stringify(messagePayload),
        signal: AbortSignal.timeout(30000)
      });

      try {
        responseData = await response.text();
      } catch (e) {
        responseData = 'Failed to read response';
      }

      webhookOk = response.ok;
      console.log('Webhook response status:', response.status, 'data:', responseData);
    } catch (fetchError: any) {
      console.error('Fetch error:', fetchError);
      webhookOk = false;
      responseData = `Fetch error: ${fetchError?.message}`;
    }

    // Save message as queued for processing by process-whatsapp-queue
    const { error: insertError } = await supabase.from('whatsapp_messages').insert({
      from_number: 'system',
      to_number: toE164,
      message_type: 'text',
      message_content: message,
      status: 'pending',
      is_reply: false,
    });

    if (insertError) {
      console.error('Error saving message record:', insertError);
    }

    return new Response(
      JSON.stringify({ success: true, status: 'queued', webhook_ok: webhookOk, webhook_response: responseData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('General error in send-direct-whatsapp:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send direct WhatsApp', details: error?.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
