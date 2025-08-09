import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  console.log('🚀 Edge Function started');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Reading request body...');
    const requestBody = await req.text();
    console.log('Raw request body:', requestBody);
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(requestBody);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { headers: corsHeaders, status: 400 }
      );
    }
    
    const { customer_phone, customer_name, message } = parsedBody;
    
    console.log('Received account summary request:', { 
      customer_phone, 
      customer_name, 
      message: message?.substring(0, 100) 
    });

    if (!customer_phone || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing customer_phone or message' }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // Get WhatsApp webhook settings from database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: webhookSettings } = await supabase
      .from('webhook_settings')
      .select('*')
      .eq('webhook_type', 'تقارير مالية واتساب')
      .eq('is_active', true)
      .single();

    if (!webhookSettings || !webhookSettings.webhook_url) {
      console.error('No active Financial Reports WhatsApp webhook found');
      return new Response(
        JSON.stringify({ error: 'No webhook configured for Financial Reports WhatsApp' }),
        { headers: corsHeaders, status: 400 }
      );
    }

    console.log('Using webhook:', webhookSettings.webhook_url);

    // حفظ الرسالة في قاعدة البيانات
    const { error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: customer_phone,
        message_type: 'text',
        message_content: message,
        status: 'pending',
        is_reply: false,
      });

    if (insertError) {
      console.error('Database error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Database error', details: insertError.message }),
        { headers: corsHeaders, status: 500 }
      );
    }

    // إرسال الرسالة عبر ويب هوك واتساب مباشرة
    const webhookPayload = {
      phone: customer_phone,
      message: message,
      customer_name: customer_name || 'العميل'
    };

    console.log('Sending to webhook:', {
      url: webhookSettings.webhook_url,
      payload: webhookPayload
    });

    try {
      const webhookResponse = await fetch(webhookSettings.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });

      const webhookResult = await webhookResponse.text();
      console.log('Webhook response:', {
        status: webhookResponse.status,
        result: webhookResult
      });

      if (!webhookResponse.ok) {
        console.error('Webhook failed:', webhookResponse.status, webhookResult);
        
        // تحديث حالة الرسالة إلى failed
        await supabase
          .from('whatsapp_messages')
          .update({ status: 'failed' })
          .eq('to_number', customer_phone)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        return new Response(
          JSON.stringify({ 
            error: 'Webhook failed', 
            details: `Status: ${webhookResponse.status}, Response: ${webhookResult}` 
          }),
          { headers: corsHeaders, status: 500 }
        );
      }

      // تحديث حالة الرسالة إلى sent
      await supabase
        .from('whatsapp_messages')
        .update({ status: 'sent' })
        .eq('to_number', customer_phone)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('✅ Account summary sent successfully via webhook');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تم إرسال الملخص المالي بنجاح عبر واتساب',
          webhook_status: webhookResponse.status,
          webhook_result: webhookResult
        }),
        { headers: corsHeaders }
      );

    } catch (webhookError) {
      console.error('Webhook error:', webhookError);
      
      // تحديث حالة الرسالة إلى failed
      await supabase
        .from('whatsapp_messages')
        .update({ status: 'failed' })
        .eq('to_number', customer_phone)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      return new Response(
        JSON.stringify({ 
          error: 'Webhook request failed', 
          details: webhookError.message 
        }),
        { headers: corsHeaders, status: 500 }
      );
    }

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error', details: error.message }),
      { headers: corsHeaders, status: 500 }
    );
  }
});