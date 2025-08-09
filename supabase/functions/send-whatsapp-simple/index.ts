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
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
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

    console.log(`Sending message to: ${phone}`);
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

    // البحث عن webhook settings مثلما يفعل send-pending-whatsapp
    let webhookSettings;
    
    console.log('🔍 البحث عن ويب هوك الحملات الجماعية...');
    
    // البحث عن ويب هوك الحملات الجماعية أولاً
    const { data: bulkCampaignWebhook, error: bulkError } = await supabase
      .from('webhook_settings')
      .select('webhook_url, webhook_type, webhook_name, is_active')
      .eq('webhook_type', 'bulk_campaign')
      .eq('is_active', true)
      .maybeSingle();
    
    if (bulkCampaignWebhook?.webhook_url) {
      webhookSettings = bulkCampaignWebhook;
      console.log('✅ استخدام ويب هوك الحملات الجماعية:', webhookSettings.webhook_name);
    } else {
      console.log('⚠️ لا يوجد ويب هوك للحملات الجماعية، جاري البحث عن بديل...');
      
      // إذا لم يوجد، ابحث عن ويب هوك عادي
      const { data: outgoingWebhook, error: outgoingError } = await supabase
        .from('webhook_settings')
        .select('webhook_url, webhook_type, webhook_name, is_active')
        .eq('webhook_type', 'outgoing')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      console.log('🔎 نتيجة البحث عن ويب هوك outgoing:', { 
        data: outgoingWebhook, 
        error: outgoingError,
        hasUrl: !!outgoingWebhook?.webhook_url
      });
      
      webhookSettings = outgoingWebhook;
    }

    console.log('📡 الويب هوك المختار نهائياً:', {
      name: webhookSettings?.webhook_name,
      type: webhookSettings?.webhook_type,
      hasUrl: !!webhookSettings?.webhook_url,
      url: webhookSettings?.webhook_url ? 'متوفر' : 'مفقود'
    });

    if (!webhookSettings?.webhook_url) {
      console.error('❌ خطأ: لا يوجد ويب هوك نشط - No active webhook found');
      return new Response(
        JSON.stringify({ 
          error: 'No webhook configured',
          details: 'لا يوجد ويب هوك مكون بشكل صحيح'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    console.log('📡 استخدام ويب هوك:', webhookSettings.webhook_name, `(${webhookSettings.webhook_type})`);

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
    const response = await fetch(webhookSettings.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload)
    });

    const responseData = await response.text();
    console.log(`Webhook response:`, responseData);

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
        message: newStatus === 'sent' ? 'تم إرسال الرسالة بنجاح' : 'تم إدخال الرسالة في قائمة الانتظار',
        messageId: messageData.id,
        status: newStatus
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