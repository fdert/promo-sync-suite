import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webhookId } = await req.json();
    console.log('Test webhook request for ID:', webhookId);

    if (!webhookId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Webhook ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch webhook details
    const { data: webhook, error: webhookError } = await supabase
      .from('webhook_settings')
      .select('*')
      .eq('id', webhookId)
      .single();

    if (webhookError || !webhook) {
      console.error('Error fetching webhook:', webhookError);
      return new Response(
        JSON.stringify({ success: false, error: 'Webhook not found' }),
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
        customer_name: 'عميل تجريبي',
      },
    };

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (webhook.secret_key) {
      headers['X-Webhook-Secret'] = webhook.secret_key as string;
    }

    console.log('Testing webhook URL:', webhook.webhook_url);
    console.log('Payload:', JSON.stringify(testPayload));

    // Send test request to webhook
    const response = await fetch(webhook.webhook_url as string, {
      method: 'POST',
      headers,
      body: JSON.stringify(testPayload),
    });

    const responseText = await response.text();

    console.log('Webhook response status:', response.status);
    console.log('Webhook response body:', responseText);

    // Log the test in webhook_logs
    const { error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        webhook_setting_id: webhook.id,
        request_payload: testPayload,
        response_status: response.status,
        response_body: responseText,
        error_message: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`,
      });

    if (logError) {
      console.error('Error logging webhook test:', logError);
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          response: responseText,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم إرسال الاختبار بنجاح',
        response: responseText,
        status: response.status,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in test-webhook-order function:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
