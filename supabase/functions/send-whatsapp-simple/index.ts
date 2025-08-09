import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

interface WhatsAppRequest {
  phone: string;
  message: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('📱 بدء معالجة طلب إرسال واتساب...');

    // Parse request body
    const { phone, message }: WhatsAppRequest = await req.json();
    
    console.log(`📞 الرقم: ${phone}`);
    console.log(`💬 الرسالة: ${message?.substring(0, 100)}...`);

    if (!phone || !message) {
      console.error('❌ بيانات مفقودة:', { phone: !!phone, message: !!message });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'رقم الهاتف والرسالة مطلوبان' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Clean phone number
    const cleanPhone = phone.replace(/[^\+0-9]/g, '');
    console.log(`🧹 الرقم المنظف: ${cleanPhone}`);

    // Save message to database
    const { data: messageData, error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: cleanPhone,
        message_type: 'text',
        message_content: message,
        status: 'pending',
        is_reply: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ خطأ في حفظ الرسالة:', insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'فشل في حفظ الرسالة', 
          details: insertError.message 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    console.log(`✅ تم حفظ الرسالة بنجاح، ID: ${messageData.id}`);

    // Get active webhook settings
    const { data: webhooks, error: webhookError } = await supabase
      .from('webhook_settings')
      .select('*')
      .eq('is_active', true)
      .in('webhook_type', ['bulk_campaign', 'outgoing'])
      .order('webhook_type', { ascending: false }); // bulk_campaign first

    if (webhookError) {
      console.error('❌ خطأ في جلب إعدادات الويب هوك:', webhookError);
    }

    // Try to send via webhook
    let messageSent = false;
    let lastError = '';

    if (webhooks && webhooks.length > 0) {
      console.log(`🔗 العثور على ${webhooks.length} ويب هوك نشط`);
      
      for (const webhook of webhooks) {
        try {
          console.log(`🚀 محاولة إرسال عبر: ${webhook.webhook_name}`);
          
          // Prepare WhatsApp message payload
          const whatsappPayload = {
            phone: cleanPhone,
            message: message,
            timestamp: new Date().toISOString(),
            message_id: messageData.id,
            webhook_type: webhook.webhook_type
          };

          const webhookResponse = await fetch(webhook.webhook_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(webhook.secret_key && { 'Authorization': `Bearer ${webhook.secret_key}` })
            },
            body: JSON.stringify(whatsappPayload)
          });

          console.log(`📊 رد الويب هوك ${webhook.webhook_name}: ${webhookResponse.status}`);

          if (webhookResponse.ok) {
            const responseText = await webhookResponse.text();
            console.log(`✅ تم إرسال الرسالة بنجاح عبر ${webhook.webhook_name}`);
            console.log(`📝 رد الخادم: ${responseText}`);
            
            // Update message status to sent
            await supabase
              .from('whatsapp_messages')
              .update({ 
                status: 'sent',
                sent_at: new Date().toISOString(),
                error_message: null
              })
              .eq('id', messageData.id);

            messageSent = true;
            break;
          } else {
            const errorText = await webhookResponse.text();
            lastError = `خطأ ${webhookResponse.status}: ${errorText}`;
            console.error(`❌ فشل الويب هوك ${webhook.webhook_name}:`, lastError);
          }
        } catch (error) {
          lastError = `خطأ في الشبكة: ${error.message}`;
          console.error(`❌ خطأ في إرسال عبر ${webhook.webhook_name}:`, error);
        }
      }
    } else {
      lastError = 'لا توجد ويب هوكس نشطة';
      console.warn('⚠️ لا توجد ويب هوكس نشطة للإرسال');
    }

    // If no webhook worked, mark as failed
    if (!messageSent) {
      console.error('❌ فشل إرسال الرسالة عبر جميع الويب هوكس');
      
      await supabase
        .from('whatsapp_messages')
        .update({ 
          status: 'failed',
          error_message: lastError
        })
        .eq('id', messageData.id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'فشل في إرسال الرسالة عبر جميع الويب هوكس',
          details: lastError,
          message_id: messageData.id
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تم إرسال الرسالة بنجاح',
        message_id: messageData.id,
        phone: cleanPhone
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ خطأ عام:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'خطأ داخلي في الخادم', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});