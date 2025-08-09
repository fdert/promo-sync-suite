import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  console.log('🚀 Customer Summary Function started');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    console.log('Request data received:', requestData);
    
    const { customer_phone, customer_name, message } = requestData;

    if (!customer_phone || !message) {
      console.error('Missing required fields:', { customer_phone, message });
      return new Response(
        JSON.stringify({ success: false, error: 'Missing customer_phone or message' }),
        { headers: corsHeaders, status: 400 }
      );
    }

    console.log('Processing summary for:', customer_name, customer_phone);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get webhook settings
    console.log('Getting webhook settings...');
    const { data: webhookSettings, error: webhookError } = await supabase
      .from('webhook_settings')
      .select('*')
      .eq('webhook_type', 'تقارير مالية واتساب')
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
      console.error('No webhook found');
      return new Response(
        JSON.stringify({ success: false, error: 'No webhook configured' }),
        { headers: corsHeaders, status: 400 }
      );
    }

    console.log('Using webhook URL:', webhookSettings.webhook_url);

    // Save message to database
    console.log('Saving message to database...');
    const { error: saveError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: customer_phone,
        message_type: 'text',
        message_content: message,
        status: 'pending',
        is_reply: false,
      });

    if (saveError) {
      console.error('Save error:', saveError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save message' }),
        { headers: corsHeaders, status: 500 }
      );
    }

    // Send to webhook
    console.log('Sending to webhook...');
    const webhookPayload = {
      phone: customer_phone,
      message: message,
      customer_name: customer_name || 'العميل'
    };

    const webhookResponse = await fetch(webhookSettings.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });

    const webhookResult = await webhookResponse.text();
    console.log('Webhook response:', webhookResponse.status, webhookResult);

    if (webhookResponse.ok) {
      // Update message status to sent
      await supabase
        .from('whatsapp_messages')
        .update({ status: 'sent' })
        .eq('to_number', customer_phone)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('✅ Message sent successfully');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تم إرسال الملخص بنجاح',
          webhook_status: webhookResponse.status
        }),
        { headers: corsHeaders }
      );
    } else {
      // Update message status to failed
      await supabase
        .from('whatsapp_messages')
        .update({ status: 'failed' })
        .eq('to_number', customer_phone)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      console.error('Webhook failed:', webhookResponse.status, webhookResult);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Webhook failed',
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