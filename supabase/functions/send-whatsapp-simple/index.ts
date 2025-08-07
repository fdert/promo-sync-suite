import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 بدء معالجة رسائل الواتساب المعلقة...');

    // جلب الرسائل المعلقة
    const { data: pendingMessages, error: fetchError } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error('خطأ في جلب الرسائل:', fetchError);
      throw fetchError;
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      console.log('لا توجد رسائل معلقة');
      return new Response(
        JSON.stringify({ message: 'No pending messages' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    console.log(`📋 تم العثور على ${pendingMessages.length} رسائل معلقة`);

    // جلب ويب هوك نشط - أي ويب هوك يعمل
    const { data: webhookSettings } = await supabase
      .from('webhook_settings')
      .select('webhook_url, webhook_name')
      .eq('is_active', true)
      .limit(1);

    if (!webhookSettings || webhookSettings.length === 0) {
      console.error('❌ لا يوجد ويب هوك نشط');
      return new Response(
        JSON.stringify({ error: 'No active webhook found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    const webhook = webhookSettings[0];
    console.log(`📡 استخدام ويب هوك: ${webhook.webhook_name}`);

    const results = [];

    // معالجة كل رسالة
    for (const message of pendingMessages) {
      try {
        console.log(`📱 إرسال رسالة إلى: ${message.to_number}`);

        // إعداد البيانات للإرسال
        const payload = {
          to: message.to_number,
          phone: message.to_number,
          phoneNumber: message.to_number,
          message: message.message_content,
          messageText: message.message_content,
          text: message.message_content,
          type: 'text',
          message_type: 'text',
          timestamp: Math.floor(Date.now() / 1000)
        };

        console.log(`📤 إرسال البيانات:`, JSON.stringify(payload, null, 2));

        // إرسال للويب هوك
        const response = await fetch(webhook.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        console.log(`📥 استجابة الويب هوك (${response.status}): ${responseText}`);

        const newStatus = response.ok ? 'sent' : 'failed';

        // تحديث حالة الرسالة
        const { error: updateError } = await supabase
          .from('whatsapp_messages')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', message.id);

        if (updateError) {
          console.error('خطأ في تحديث الرسالة:', updateError);
        }

        results.push({
          message_id: message.id,
          to_number: message.to_number,
          status: newStatus,
          webhook_response: responseText
        });

        if (response.ok) {
          console.log(`✅ تم إرسال الرسالة بنجاح إلى ${message.to_number}`);
        } else {
          console.error(`❌ فشل إرسال الرسالة إلى ${message.to_number}: ${response.status}`);
        }

        // تأخير قصير بين الرسائل
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (messageError) {
        console.error(`❌ خطأ في معالجة الرسالة ${message.id}:`, messageError);
        
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

    console.log(`🎯 اكتملت المعالجة: ${results.length} رسائل`);

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
    console.error('❌ خطأ عام:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process messages', 
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});