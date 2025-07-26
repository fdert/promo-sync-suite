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

      // التحقق من وجود الرسالة
      if (body.message) {
        const message = body.message;
        
        // البحث عن العميل أو إنشاؤه
        let customer = null;
        if (message.from) {
          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('*')
            .eq('whatsapp_number', message.from)
            .single();

          if (existingCustomer) {
            customer = existingCustomer;
          } else {
            // إنشاء عميل جديد
            const { data: newCustomer, error: customerError } = await supabase
              .from('customers')
              .insert({
                name: message.profile?.name || `عميل واتس آب ${message.from}`,
                whatsapp_number: message.from,
                phone: message.from,
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
        }

        // حفظ الرسالة في قاعدة البيانات
        const messageData = {
          message_id: message.id || null,
          from_number: message.from,
          to_number: message.to || null,
          message_type: message.type || 'text',
          message_content: message.text?.body || message.caption || '',
          media_url: message.image?.link || message.video?.link || message.audio?.link || message.document?.link || null,
          status: 'received',
          timestamp: new Date(message.timestamp * 1000).toISOString(),
          customer_id: customer?.id || null,
          is_reply: false
        };

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