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
    console.log('Processing WhatsApp message request...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { phone, message }: WhatsAppRequest = await req.json();
    
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

    console.log(`Sending message to: ${phone}`);
    console.log(`Message content: ${message.substring(0, 100)}...`);

    // Clean phone number (remove non-digits except +)
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    console.log(`Cleaned phone: ${cleanPhone}`);

    // Insert message into whatsapp_messages table
    const { data: messageData, error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert([
        {
          phone_number: cleanPhone,
          message_content: message,
          status: 'pending',
          message_type: 'summary',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to queue message for sending' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Message queued successfully:', messageData.id);

    // Try to send immediately via webhook
    try {
      const webhookUrl = 'https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/whatsapp-webhook';
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({
          phone: cleanPhone,
          message: message,
          messageId: messageData.id
        })
      });

      if (webhookResponse.ok) {
        console.log('Message sent immediately via webhook');
        
        // Update message status to sent
        await supabase
          .from('whatsapp_messages')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', messageData.id);
          
      } else {
        console.warn('Webhook send failed, message will be processed by queue');
      }
    } catch (webhookError) {
      console.warn('Webhook send error:', webhookError, 'message will be processed by queue');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تم إرسال الرسالة بنجاح',
        messageId: messageData.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-whatsapp-simple:', error);
    return new Response(
      JSON.stringify({ 
        error: 'فشل في إرسال الرسالة',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});