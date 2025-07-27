import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// إنشاء عميل Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    if (req.method === 'POST') {
      // التعامل مع الرسائل الواردة من n8n
      const body = await req.json();
      console.log('Received WhatsApp webhook:', JSON.stringify(body, null, 2));

      // تنسيقات مختلفة للبيانات الواردة من n8n
      let messageData = null;
      
      // تنسيق 1: رسالة مباشرة من WhatsApp Business API
      if (body.message) {
        const message = body.message;
        messageData = {
          message_id: message.id || null,
          from_number: message.from,
          to_number: message.to || 'system',
          message_type: message.type || 'text',
          message_content: message.text?.body || message.caption || message.body || '',
          media_url: message.image?.link || message.video?.link || message.audio?.link || message.document?.link || null,
          status: 'received',
          timestamp: message.timestamp ? new Date(message.timestamp * 1000).toISOString() : new Date().toISOString(),
          is_reply: false
        };
      }
      
      // تنسيق 2: البيانات مباشرة في الـ body
      else if (body.from || body.sender) {
        messageData = {
          message_id: body.id || body.messageId || null,
          from_number: body.from || body.sender || body.phone,
          to_number: body.to || body.recipient || 'system',
          message_type: body.type || 'text',
          message_content: body.message || body.text || body.content || '',
          media_url: body.media_url || body.mediaUrl || null,
          status: 'received',
          timestamp: body.timestamp ? new Date(body.timestamp * 1000).toISOString() : new Date().toISOString(),
          is_reply: false
        };
      }
      
      // تنسيق 3: n8n custom format
      else if (body.data) {
        const data = body.data;
        messageData = {
          message_id: data.id || null,
          from_number: data.from || data.sender,
          to_number: data.to || 'system',
          message_type: data.type || 'text',
          message_content: data.message || data.text || '',
          media_url: data.media_url || null,
          status: 'received',
          timestamp: data.timestamp ? new Date(data.timestamp * 1000).toISOString() : new Date().toISOString(),
          is_reply: false
        };
      }

      if (messageData && messageData.from_number) {
        // البحث عن العميل أو إنشاؤه
        let customer = null;
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('*')
          .eq('whatsapp_number', messageData.from_number)
          .single();

        if (existingCustomer) {
          customer = existingCustomer;
        } else {
          // إنشاء عميل جديد
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              name: body.profile?.name || body.customerName || `عميل واتس آب ${messageData.from_number}`,
              whatsapp_number: messageData.from_number,
              phone: messageData.from_number,
              import_source: 'whatsapp_webhook'
            })
            .select()
            .single();

          if (customerError) {
            console.error('Error creating customer:', customerError);
          } else {
            customer = newCustomer;
          }
        }

        // إضافة معرف العميل
        messageData.customer_id = customer?.id || null;

        // حفظ الرسالة في قاعدة البيانات
        const { data: savedMessage, error: messageError } = await supabase
          .from('whatsapp_messages')
          .insert(messageData);

        if (messageError) {
          console.error('Error saving message:', messageError);
          return new Response(
            JSON.stringify({ error: 'Failed to save message' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500
            }
          );
        }

        console.log('Message saved successfully:', savedMessage);

        // إرسال رد تلقائي إذا كان هناك قالب ترحيب
        const { data: welcomeTemplate } = await supabase
          .from('message_templates')
          .select('*')
          .eq('template_type', 'welcome')
          .eq('is_active', true)
          .single();

        if (welcomeTemplate && customer) {
          // هنا يمكن إرسال رسالة ترحيب تلقائية
          console.log('Welcome template found:', welcomeTemplate.template_content);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Message processed successfully',
            customer_id: customer?.id
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }

      // إذا لم تكن رسالة، إرجاع رد عادي
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook received' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );

    } else if (req.method === 'GET') {
      // التحقق من webhook (webhook verification)
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      // التحقق من token (يجب إعداده في n8n)
      if (mode === 'subscribe' && token === 'whatsapp_webhook_token') {
        return new Response(challenge, {
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
          status: 200
        });
      }

      return new Response('Invalid verification token', {
        headers: corsHeaders,
        status: 403
      });
    }

    return new Response('Method not allowed', {
      headers: corsHeaders,
      status: 405
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});