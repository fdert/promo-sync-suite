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
    // قراءة بيانات الطلب
    let requestBody = {};
    try {
      requestBody = await req.json();
    } catch (e) {
      // إذا لم تكن هناك بيانات JSON، استخدم كائن فارغ
    }
    
    console.log('Processing pending WhatsApp messages...', requestBody);

    // الحصول على الرسائل المعلقة (pending)
    let query = supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('status', 'pending');
    
    // إذا كان هناك معطى review_messages_only، اجلب رسائل التقييم فقط
    if (requestBody?.review_messages_only) {
      console.log('Filtering for Google review messages only...');
      query = query.not('customer_id', 'is', null)
                   .like('message_content', '%search.google.com%');
    }
    
    const { data: pendingMessages, error: fetchError } = await query.limit(10); // معالجة 10 رسائل في المرة الواحدة

    if (fetchError) {
      console.error('Error fetching pending messages:', fetchError);
      throw fetchError;
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

    // البحث عن ويب هوك مناسب - أولوية للحملات الجماعية
    let webhookSettings;
    
    console.log('🔍 البحث عن ويب هوك الحملات الجماعية...');
    
    // البحث عن ويب هوك الحملات الجماعية أولاً
    const { data: bulkCampaignWebhook, error: bulkError } = await supabase
      .from('webhook_settings')
      .select('webhook_url, webhook_type, webhook_name')
      .eq('webhook_type', 'bulk_campaign')
      .eq('is_active', true)
      .maybeSingle();
    
    console.log('نتيجة البحث عن ويب هوك الحملات الجماعية:', { bulkCampaignWebhook, bulkError });
    
    if (bulkCampaignWebhook?.webhook_url) {
      webhookSettings = bulkCampaignWebhook;
      console.log('✅ استخدام ويب هوك الحملات الجماعية:', webhookSettings.webhook_name);
    } else {
      console.log('⚠️ لا يوجد ويب هوك للحملات الجماعية، جاري البحث عن بديل...');
      
      // إذا لم يوجد، ابحث عن ويب هوك عادي
      const { data: outgoingWebhook, error: outgoingError } = await supabase
        .from('webhook_settings')
        .select('webhook_url, webhook_type, webhook_name')
        .eq('webhook_type', 'outgoing')
        .eq('is_active', true)
        .maybeSingle();
      
      console.log('نتيجة البحث عن ويب هوك outgoing:', { outgoingWebhook, outgoingError });
      
      webhookSettings = outgoingWebhook;
    }

    console.log('الويب هوك المختار نهائياً:', webhookSettings);

    if (!webhookSettings?.webhook_url) {
      console.error('❌ No active webhook found - لا يوجد ويب هوك نشط');
      return new Response(
        JSON.stringify({ error: 'No webhook configured' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    console.log('📡 استخدام ويب هوك:', webhookSettings.webhook_name, `(${webhookSettings.webhook_type})`);


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

        // إرسال الرسالة عبر webhook إلى n8n
        const response = await fetch(webhookSettings.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messagePayload)
        });

        const responseData = await response.text();
        console.log(`Webhook response for message ${message.id}:`, responseData);

        let newStatus = 'sent';
        
        if (!response.ok) {
          console.error(`Webhook failed for message ${message.id}:`, response.status, responseData);
          newStatus = 'failed';
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