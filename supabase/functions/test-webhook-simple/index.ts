import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  console.log('🚀 Test Webhook Function started');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get webhook settings for financial reports WhatsApp
    console.log('Getting webhook settings...');
    const { data: webhookSettings, error: webhookError } = await supabase
      .from('webhook_settings')
      .select('*')
      .eq('webhook_type', 'account_summary')
      .eq('is_active', true)
      .maybeSingle();

    if (webhookError) {
      console.error('Webhook settings error:', webhookError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to get webhook settings' }),
        { headers: corsHeaders, status: 500 }
      );
    }

    if (!webhookSettings?.webhook_url) {
      console.error('No webhook found for account_summary');
      return new Response(
        JSON.stringify({ success: false, error: 'No webhook configured for account_summary' }),
        { headers: corsHeaders, status: 400 }
      );
    }

    console.log('Using webhook URL:', webhookSettings.webhook_url);

    // Test payload
    const testPayload = {
      phone: '+966535983261',
      message: 'اختبار رسالة واتساب من النظام',
      customer_name: 'عميل تجريبي'
    };

    console.log('Sending test message to webhook...');
    console.log('Payload:', testPayload);

    // Send to webhook with POST method
    const webhookResponse = await fetch(webhookSettings.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    const webhookResult = await webhookResponse.text();
    console.log('Webhook response status:', webhookResponse.status);
    console.log('Webhook response:', webhookResult);

    if (webhookResponse.ok) {
      console.log('✅ Test message sent successfully');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تم إرسال الرسالة التجريبية بنجاح',
          webhook_status: webhookResponse.status,
          webhook_response: webhookResult
        }),
        { headers: corsHeaders }
      );
    } else {
      console.error('❌ Webhook failed:', webhookResponse.status, webhookResult);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Webhook failed',
          status: webhookResponse.status,
          details: webhookResult
        }),
        { headers: corsHeaders, status: 500 }
      );
    }

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Function error', 
        details: error.message 
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
});