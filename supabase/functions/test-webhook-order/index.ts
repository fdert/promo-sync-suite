import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webhookId } = await req.json();

    if (!webhookId) {
      return new Response(
        JSON.stringify({ error: 'Webhook ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch webhook details
    const { data: webhook, error: webhookError } = await supabaseClient
      .from('webhook_settings')
      .select('*')
      .eq('id', webhookId)
      .single();

    if (webhookError || !webhook) {
      console.error('Error fetching webhook:', webhookError);
      return new Response(
        JSON.stringify({ error: 'Webhook not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare test payload
    const testPayload = {
      event: 'order.status_changed',
      timestamp: new Date().toISOString(),
      data: {
        order_id: 'test-order-id',
        order_number: 'ORD-20250101-00001',
        old_status: 'جديد',
        new_status: 'مؤكد',
        customer_id: 'test-customer-id',
        customer_name: 'عميل تجريبي'
      }
    };

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (webhook.secret_key) {
      headers['X-Webhook-Secret'] = webhook.secret_key;
    }

    console.log('Testing webhook:', webhook.webhook_url);
    console.log('Payload:', JSON.stringify(testPayload, null, 2));

    // Send test request to webhook
    const response = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers,
      body: JSON.stringify(testPayload),
    });

    const responseText = await response.text();
    
    console.log('Webhook response status:', response.status);
    console.log('Webhook response:', responseText);

    // Log the test
    await supabaseClient
      .from('webhook_logs')
      .insert({
        webhook_setting_id: webhook.id,
        request_payload: testPayload,
        response_status: response.status,
        response_body: responseText,
        error_message: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
      });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          response: responseText
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'تم إرسال الاختبار بنجاح',
        response: responseText,
        status: response.status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error testing webhook:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
