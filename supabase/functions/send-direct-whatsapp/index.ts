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

    // Queue message only (no direct webhook calls here)
    const { error: insertError, data } = await supabase
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
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Best-effort trigger queue processor (non-blocking for client success)
    try {
      await supabase.functions.invoke('process-whatsapp-queue', { body: { trigger: 'send-direct-whatsapp' } });
    } catch (e) {
      console.warn('process-whatsapp-queue invocation failed (ignored):', e?.message || e);
    }

    return new Response(
      JSON.stringify({ success: true, status: 'queued', message_id: data?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('General error in send-direct-whatsapp:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to queue WhatsApp', details: error?.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
