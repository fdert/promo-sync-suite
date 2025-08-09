import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // إرسال رسالة تجريبية
    const { error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: '+966535983261',
        message_type: 'text',
        message_content: `رسالة تجريبية للتأكد من عمل الويب هوك الجديد - ${new Date().toLocaleString('ar-SA')}`,
        status: 'pending',
        is_reply: false,
      });

    if (insertError) {
      console.error('خطأ في إدراج الرسالة:', insertError);
      return new Response(
        JSON.stringify({ error: 'فشل في إدراج الرسالة', details: insertError.message }),
        { headers: corsHeaders, status: 500 }
      );
    }

    console.log('تم إدراج رسالة تجريبية بنجاح');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تم إرسال رسالة تجريبية بنجاح'
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('خطأ:', error);
    return new Response(
      JSON.stringify({ error: 'خطأ داخلي', details: error.message }),
      { headers: corsHeaders, status: 500 }
    );
  }
});