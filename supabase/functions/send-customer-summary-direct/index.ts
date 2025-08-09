import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhatsAppRequest {
  phone: string;
  message: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing customer summary WhatsApp message request...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody = await req.text();
    console.log('Raw request body:', requestBody);
    
    let requestData: WhatsAppRequest;
    try {
      requestData = JSON.parse(requestBody);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { phone, message } = requestData;
    
    if (!phone || !message) {
      console.error('Missing phone or message in request');
      return new Response(
        JSON.stringify({ error: 'Phone and message are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Sending customer summary to: ${phone}`);
    console.log(`Message content length: ${message.length}`);

    // Clean phone number (remove non-digits except +)
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    console.log(`Cleaned phone: ${cleanPhone}`);

    // Insert message into whatsapp_messages table
    const { data: messageData, error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert([
        {
          to_number: cleanPhone,
          message_content: message,
          status: 'pending',
          message_type: 'text',
          from_number: 'system',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to queue message for sending', details: insertError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Message queued successfully:', messageData.id);

    // استخدام webhook التقارير المالية مباشرة
    const webhookUrl = 'https://n8n.srv894347.hstgr.cloud/webhook-test/ca719409-ac29-485a-99d4-3b602978eace';
    
    console.log('🚀 إرسال رسالة مباشرة إلى webhook التقارير المالية');

    // إعداد بيانات الرسالة للإرسال
    const messagePayload = {
      messaging_product: "whatsapp",
      to: cleanPhone.replace('+', ''),
      type: "text",
      text: {
        body: message
      }
    };

    console.log('Sending message payload:', JSON.stringify(messagePayload, null, 2));

    // إرسال الرسالة عبر webhook إلى n8n
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload)
    });

    const responseData = await response.text();
    console.log(`Webhook response:`, response.status, responseData);

    let newStatus = 'sent';
    
    if (!response.ok) {
      console.error(`Webhook failed:`, response.status, responseData);
      newStatus = 'failed';
    }

    // تحديث حالة الرسالة
    const { error: updateError } = await supabase
      .from('whatsapp_messages')
      .update({ 
        status: newStatus,
        replied_at: new Date().toISOString()
      })
      .eq('id', messageData.id);

    if (updateError) {
      console.error(`Error updating message:`, updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: newStatus === 'sent' ? 'تم إرسال الملخص المالي بنجاح' : 'تم إدخال الرسالة في قائمة الانتظار',
        messageId: messageData.id,
        status: newStatus,
        webhookResponse: responseData
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-customer-summary-direct:', error);
    return new Response(
      JSON.stringify({ 
        error: 'فشل في إرسال الملخص المالي',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});