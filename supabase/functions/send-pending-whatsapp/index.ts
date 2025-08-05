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
    console.log('Processing pending WhatsApp messages...');

    let pendingMessages;
    
    // التحقق إذا كان الطلب يحتوي على معرف رسالة محددة
    const requestBody = await req.text();
    let specificMessageId = null;
    
    if (requestBody) {
      try {
        const body = JSON.parse(requestBody);
        specificMessageId = body.message_id;
      } catch (parseError) {
        console.log('No JSON body or invalid JSON, processing all pending messages');
      }
    }

    if (specificMessageId) {
      // إرسال رسالة محددة
      console.log(`Processing specific message: ${specificMessageId}`);
      const { data: specificMessage, error: fetchError } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('id', specificMessageId)
        .eq('status', 'pending')
        .single();

      if (fetchError) {
        console.error('Error fetching specific message:', fetchError);
        throw fetchError;
      }

      pendingMessages = specificMessage ? [specificMessage] : [];
    } else {
      // الحصول على الرسائل المعلقة (pending)
      const { data: allPending, error: fetchError } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('status', 'pending')
        .limit(10); // معالجة 10 رسائل في المرة الواحدة

      if (fetchError) {
        console.error('Error fetching pending messages:', fetchError);
        throw fetchError;
      }

      pendingMessages = allPending || [];
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      console.log('No pending messages found');
      return new Response(
        JSON.stringify({ message: 'No pending messages to process' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    console.log(`Found ${pendingMessages.length} pending messages`);

    // الحصول على إعدادات الويب هوك للإرسال
    let webhookSettings;
    
    // أولاً نحاول العثور على ويب هوك البروفة للرسائل التي تحتوي على بروفة
    const hasProofMessages = pendingMessages.some(msg => 
      msg.message_type === 'image' || 
      (msg.message_content && msg.message_content.includes('لاستعراض البروفة'))
    );
    
    if (hasProofMessages) {
      console.log('Looking for proof webhook...');
      const { data: proofWebhook, error: proofError } = await supabase
        .from('webhook_settings')
        .select('webhook_url, webhook_type, webhook_name')
        .eq('webhook_type', 'proof')
        .eq('is_active', true)
        .maybeSingle();
      
      if (proofError) {
        console.error('Error fetching proof webhook:', proofError);
      }
      
      webhookSettings = proofWebhook;
      console.log('Proof webhook found:', webhookSettings);
    }
    
    // إذا لم نجد ويب هوك البروفة، نبحث عن ويب هوك الطلبات
    if (!webhookSettings?.webhook_url) {
      console.log('Looking for orders webhook...');
      const { data: orderWebhook, error: orderError } = await supabase
        .from('webhook_settings')
        .select('webhook_url, webhook_type, webhook_name')
        .eq('webhook_type', 'outgoing')
        .eq('is_active', true)
        .maybeSingle();
      
      if (orderError) {
        console.error('Error fetching order webhook:', orderError);
      }
      
      webhookSettings = orderWebhook;
      console.log('Order webhook found:', webhookSettings);
    }
    
    // إذا لم نجد أي ويب هوك، نبحث عن أي ويب هوك نشط
    if (!webhookSettings?.webhook_url) {
      console.log('Looking for any active webhook...');
      const { data: anyWebhook, error: anyError } = await supabase
        .from('webhook_settings')
        .select('webhook_url, webhook_type, webhook_name')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      if (anyError) {
        console.error('Error fetching any webhook:', anyError);
      }
      
      webhookSettings = anyWebhook;
      console.log('Any webhook found:', webhookSettings);
    }

    if (!webhookSettings?.webhook_url) {
      console.error('No active webhook found in database');
      
      // دعنا نتحقق من جميع الويب هوك في قاعدة البيانات
      const { data: allWebhooks, error: debugError } = await supabase
        .from('webhook_settings')
        .select('*');
      
      console.log('All webhooks in database:', allWebhooks);
      if (debugError) console.error('Debug query error:', debugError);
      
      return new Response(
        JSON.stringify({ error: 'No active webhook configured for WhatsApp messages' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    const results = [];

    // معالجة كل رسالة معلقة
    for (const message of pendingMessages) {
      try {
        // إعداد بيانات الرسالة للإرسال عبر n8n
        let messagePayload;
        
        if (message.message_type === 'image' && message.media_url) {
          // رسالة مع صورة - إرسال الصورة مع النص المدمج
          messagePayload = {
            messaging_product: "whatsapp",
            to: message.to_number.replace('+', ''),
            type: "image",
            image: {
              link: message.media_url,
              caption: message.message_content
            }
          };
        } else if (message.message_type === 'document' && message.media_url) {
          // ملف PDF أو مستند
          messagePayload = {
            messaging_product: "whatsapp",
            to: message.to_number.replace('+', ''),
            type: "document",
            document: {
              link: message.media_url,
              caption: message.message_content,
              filename: "proof.pdf"
            }
          };
        } else {
          // رسالة نصية عادية
          messagePayload = {
            messaging_product: "whatsapp",
            to: message.to_number.replace('+', ''),
            type: "text",
            text: {
              body: message.message_content
            }
          };
        }

        console.log(`Sending message to ${message.to_number}:`, JSON.stringify(messagePayload, null, 2));
        console.log(`Using webhook: ${webhookSettings.webhook_url} (type: ${webhookSettings.webhook_type})`);

        // إرسال الرسالة عبر webhook إلى n8n
        const response = await fetch(webhookSettings.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'PrintShop-WhatsApp/1.0'
          },
          body: JSON.stringify(messagePayload)
        });

        const responseData = await response.text();
        console.log(`Webhook response for message ${message.id}: Status ${response.status}, Body: ${responseData}`);

        let newStatus = 'sent';
        
        if (!response.ok) {
          console.error(`Webhook failed for message ${message.id}: Status ${response.status}, Response: ${responseData}`);
          newStatus = 'failed';
        } else {
          console.log(`✅ Message ${message.id} sent successfully to webhook`);
        }

        // إذا كانت رسالة نصية منفصلة للبروفة، لا تُرسل رسالة إضافية
        // النظام الآن يرسل رسالة نصية ورسالة صورة منفصلتين من التطبيق

        // تحديث حالة الرسالة
        const { error: updateError } = await supabase
          .from('whatsapp_messages')
          .update({ 
            status: newStatus,
            replied_at: new Date().toISOString()
          })
          .eq('id', message.id);

        if (updateError) {
          console.error(`Error updating message ${message.id}:`, updateError);
        }

        results.push({
          message_id: message.id,
          to_number: message.to_number,
          status: newStatus,
          webhook_response: responseData
        });

        // تأخير قصير بين الرسائل لتجنب الضغط على API
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (messageError) {
        console.error(`Error processing message ${message.id}:`, messageError);
        
        // تحديث حالة الرسالة إلى failed
        await supabase
          .from('whatsapp_messages')
          .update({ status: 'failed' })
          .eq('id', message.id);

        results.push({
          message_id: message.id,
          to_number: message.to_number,
          status: 'failed',
          error: messageError.message
        });
      }
    }

    console.log('Processing completed:', results);

    return new Response(
      JSON.stringify({ 
        success: true,
        processed_count: results.length,
        results: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('General error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process pending messages', 
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});