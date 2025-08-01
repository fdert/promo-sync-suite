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
    console.log('معالجة رسائل الواتس آب المعلقة...');

    // جلب الرسائل المعلقة
    const { data: pendingMessages, error: fetchError } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error('خطأ في جلب الرسائل المعلقة:', fetchError);
      throw fetchError;
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      console.log('لا توجد رسائل معلقة');
      return new Response(
        JSON.stringify({ message: 'No pending messages to process' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    console.log(`تم العثور على ${pendingMessages.length} رسائل معلقة`);

    const results = [];

    // معالجة كل رسالة
    for (const message of pendingMessages) {
      try {
        console.log(`معالجة الرسالة إلى ${message.to_number}`);

        // IMPORTANT: هنا يجب ربط الرسالة بخدمة واتس آب حقيقية
        // حالياً سنضع placeholder لخدمة الواتس آب
        
        // محاكاة إرسال الرسالة (يجب استبدالها بخدمة واتس آب حقيقية)
        const success = await sendToWhatsAppService(message);

        let newStatus = success ? 'sent' : 'failed';

        // تحديث حالة الرسالة
        const { error: updateError } = await supabase
          .from('whatsapp_messages')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', message.id);

        if (updateError) {
          console.error(`خطأ في تحديث الرسالة ${message.id}:`, updateError);
        }

        results.push({
          message_id: message.id,
          to_number: message.to_number,
          status: newStatus
        });

        console.log(`تم إرسال الرسالة ${message.id} بحالة: ${newStatus}`);

        // تأخير قصير بين الرسائل
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (messageError) {
        console.error(`خطأ في معالجة الرسالة ${message.id}:`, messageError);
        
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

    console.log('اكتملت المعالجة:', results);

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
    console.error('خطأ عام:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process whatsapp queue', 
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// دالة مساعدة لإرسال الرسائل إلى خدمة الواتس آب
async function sendToWhatsAppService(message: any): Promise<boolean> {
  try {
    // PLACEHOLDER: هنا يجب استبدال هذا بخدمة واتس آب حقيقية
    
    console.log(`📱 إرسال رسالة واتس آب:`);
    console.log(`إلى: ${message.to_number}`);
    console.log(`النص: ${message.message_content}`);
    
    // محاكاة نجاح الإرسال
    // في التطبيق الحقيقي، يجب استخدام API خدمة الواتس آب المطلوبة
    
    // مثال لاستخدام خدمة واتس آب:
    /*
    const whatsappApiKey = Deno.env.get('WHATSAPP_API_KEY');
    const response = await fetch('https://api.whatsapp-service.com/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: message.to_number,
        text: message.message_content
      })
    });
    
    return response.ok;
    */
    
    // حالياً نعيد true لمحاكاة النجاح
    return true;
    
  } catch (error) {
    console.error('خطأ في إرسال الرسالة للواتس آب:', error);
    return false;
  }
}