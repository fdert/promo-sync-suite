import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('بدء معالجة رسائل المتابعة الداخلية...');

    // جلب رسائل المتابعة المعلقة
    const { data: pendingMessages, error: fetchError } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .in('message_type', ['follow_up_notification', 'delivery_delay_notification', 'payment_delay_notification'])
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error('خطأ في جلب الرسائل:', fetchError);
      throw fetchError;
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      console.log('لا توجد رسائل متابعة معلقة');
      return new Response(
        JSON.stringify({ message: 'لا توجد رسائل متابعة معلقة', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`تم العثور على ${pendingMessages.length} رسالة متابعة معلقة`);

    // الحصول على إعدادات الواتساب
    const whatsappToken = Deno.env.get('WHATSAPP_TOKEN');
    const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!whatsappToken || !whatsappPhoneId) {
      console.error('إعدادات الواتساب غير مكتملة');
      
      // تحديث حالة الرسائل إلى فاشلة
      await supabase
        .from('whatsapp_messages')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .in('id', pendingMessages.map(msg => msg.id));

      return new Response(
        JSON.stringify({ error: 'إعدادات الواتساب غير مكتملة' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let processedCount = 0;
    let failedCount = 0;

    // معالجة كل رسالة
    for (const message of pendingMessages) {
      try {
        console.log(`إرسال رسالة متابعة إلى: ${message.to_number}`);

        const whatsappPayload = {
          messaging_product: "whatsapp",
          to: message.to_number.replace(/[^\d]/g, ''),
          type: "text",
          text: {
            body: message.message_content
          }
        };

        // إرسال الرسالة عبر WhatsApp Business API
        const whatsappResponse = await fetch(
          `https://graph.facebook.com/v17.0/${whatsappPhoneId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${whatsappToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(whatsappPayload),
          }
        );

        const responseData = await whatsappResponse.json();

        if (whatsappResponse.ok && responseData.messages) {
          console.log(`تم إرسال رسالة المتابعة بنجاح إلى: ${message.to_number}`);
          
          // تحديث حالة الرسالة إلى مرسلة
          await supabase
            .from('whatsapp_messages')
            .update({ 
              status: 'sent',
              whatsapp_message_id: responseData.messages[0]?.id,
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', message.id);

          processedCount++;
        } else {
          console.error(`فشل إرسال رسالة المتابعة إلى: ${message.to_number}`, responseData);
          
          // تحديث حالة الرسالة إلى فاشلة
          await supabase
            .from('whatsapp_messages')
            .update({ 
              status: 'failed',
              error_message: JSON.stringify(responseData),
              updated_at: new Date().toISOString()
            })
            .eq('id', message.id);

          failedCount++;
        }
      } catch (error) {
        console.error(`خطأ في معالجة رسالة المتابعة ${message.id}:`, error);
        
        // تحديث حالة الرسالة إلى فاشلة
        await supabase
          .from('whatsapp_messages')
          .update({ 
            status: 'failed',
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', message.id);

        failedCount++;
      }
    }

    console.log(`تمت معالجة رسائل المتابعة - نجح: ${processedCount}, فشل: ${failedCount}`);

    return new Response(
      JSON.stringify({ 
        message: 'تمت معالجة رسائل المتابعة',
        processed: processedCount,
        failed: failedCount,
        total: pendingMessages.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('خطأ في معالجة رسائل المتابعة:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});