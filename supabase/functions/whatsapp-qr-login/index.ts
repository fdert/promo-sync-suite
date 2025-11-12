import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WORKER_URL = (Deno.env.get('WHATSAPP_WORKER_URL') || '').replace(/\/$/, '');
    const WORKER_TOKEN = Deno.env.get('WHATSAPP_WORKER_TOKEN') || '';

    if (!WORKER_URL || !WORKER_TOKEN) {
      console.warn('Missing worker secrets WHATSAPP_WORKER_URL/WHATSAPP_WORKER_TOKEN');
      return new Response(
        JSON.stringify({
          error: 'missing_worker_secrets',
          message: 'يجب ضبط WHATSAPP_WORKER_URL و WHATSAPP_WORKER_TOKEN في أسرار المشروع.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { action, phone_number } = body as { action?: string; phone_number?: string };

    console.log(`Proxy action: ${action} phone: ${phone_number}`);

    const callWorker = async (path: string, method: 'GET' | 'POST' = 'POST', payload?: Record<string, unknown>) => {
      const url = `${WORKER_URL}${path}`;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WORKER_TOKEN}`,
      };

      const res = await fetch(url, {
        method,
        headers,
        body: method === 'POST' ? JSON.stringify(payload || {}) : undefined,
      });

      const text = await res.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch (_) { data = { raw: text }; }
      if (!res.ok) {
        console.error('Worker error', res.status, data);
        throw new Error(data?.message || `Worker responded ${res.status}`);
      }
      return data;
    };

    switch (action) {
      case 'generate_pairing_code': {
        if (!phone_number) throw new Error('phone_number is required');
        const data = await callWorker('/pairing/start', 'POST', { phone_number });
        return new Response(
          JSON.stringify({
            success: true,
            pairing_code: data.pairing_code,
            session_id: data.session_id,
            expires_in: data.expires_in,
            instructions: [
              '1. افتح واتساب على جوالك',
              '2. الإعدادات > الأجهزة المرتبطة',
              '3. اضغط على "ربط جهاز"',
              '4. اختر "ربط باستخدام رقم الهاتف بدلاً من ذلك"',
              '5. أدخل الكود: ' + (data.pairing_code || '')
            ]
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'check_status': {
        if (!phone_number) throw new Error('phone_number is required');
        const data = await callWorker('/pairing/status', 'POST', { phone_number });
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'disconnect': {
        if (!phone_number) throw new Error('phone_number is required');
        const data = await callWorker('/pairing/disconnect', 'POST', { phone_number });
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'fetch_messages': {
        if (!phone_number) throw new Error('phone_number is required');
        const data = await callWorker('/messages/sync', 'POST', { phone_number });
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      default:
        return new Response(
          JSON.stringify({ error: 'invalid_action', message: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('Proxy Error:', error);
    return new Response(
      JSON.stringify({ error: 'proxy_failed', message: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
