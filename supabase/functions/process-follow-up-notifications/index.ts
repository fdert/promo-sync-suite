import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('⚡ معالجة إشعارات المتابعة...');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get WhatsApp API settings
    const whatsappToken = Deno.env.get('WHATSAPP_TOKEN');
    const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    
    if (!whatsappToken || !whatsappPhoneId) {
      console.log('⚠️ إعدادات واتساب غير مكتملة');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'إعدادات واتساب غير مكتملة',
          processed: 0,
          failed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get pending follow-up messages
    const { data: pendingMessages, error: fetchError } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('status', 'pending')
      .eq('message_type', 'follow_up_notification')
      .limit(50);

    if (fetchError) {
      console.error('❌ خطأ في جلب الرسائل:', fetchError);
      throw fetchError;
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      console.log('✅ لا توجد رسائل متابعة معلقة');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'لا توجد رسائل متابعة معلقة',
          processed: 0,
          failed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📨 معالجة ${pendingMessages.length} رسالة متابعة`);
    
    let processedCount = 0;
    let failedCount = 0;

    // Process each message
    for (const message of pendingMessages) {
      try {
        console.log(`📤 إرسال رسالة إلى: ${message.to_number}`);
        
        // Send WhatsApp message
        const response = await fetch(`https://graph.facebook.com/v17.0/${whatsappPhoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${whatsappToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: message.to_number.replace(/\+/g, ''),
            type: 'text',
            text: {
              body: message.message_content
            }
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ تم إرسال الرسالة بنجاح:`, result.messages?.[0]?.id);
          
          // Update message status to sent
          await supabase
            .from('whatsapp_messages')
            .update({ 
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', message.id);
          
          processedCount++;
        } else {
          const errorText = await response.text();
          console.error(`❌ فشل إرسال الرسالة:`, errorText);
          
          // Update message status to failed
          await supabase
            .from('whatsapp_messages')
            .update({ 
              status: 'failed',
              error_message: `HTTP ${response.status}: ${errorText}`
            })
            .eq('id', message.id);
          
          failedCount++;
        }
      } catch (error) {
        console.error(`❌ خطأ في معالجة الرسالة ${message.id}:`, error);
        
        // Update message status to failed
        await supabase
          .from('whatsapp_messages')
          .update({ 
            status: 'failed',
            error_message: error.message
          })
          .eq('id', message.id);
        
        failedCount++;
      }
    }

    console.log(`✅ انتهى: ${processedCount} نجح، ${failedCount} فشل`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `تم معالجة ${processedCount + failedCount} رسالة`,
        processed: processedCount,
        failed: failedCount,
        total_messages: pendingMessages.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ خطأ عام:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        processed: 0,
        failed: 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});