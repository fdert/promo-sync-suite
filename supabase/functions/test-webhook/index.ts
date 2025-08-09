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
    console.log('بداية معالجة طلب إنشاء رسالة تجريبية...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('تم إنشاء عميل Supabase بنجاح');

    // إرسال رسالة تجريبية
    const messageData = {
      from_number: 'system',
      to_number: '+966535983261',
      message_type: 'text',
      message_content: `رسالة تجريبية للتأكد من عمل الويب هوك الجديد - ${new Date().toLocaleString('ar-SA')}`,
      status: 'pending',
      is_reply: false,
    };

    console.log('بيانات الرسالة المراد إدراجها:', messageData);

    const { data: insertedData, error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert(messageData)
      .select();

    if (insertError) {
      console.error('خطأ في إدراج الرسالة:', insertError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'فشل في إدراج الرسالة', 
          details: insertError.message,
          code: insertError.code 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('تم إدراج رسالة تجريبية بنجاح:', insertedData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تم إرسال رسالة تجريبية بنجاح',
        data: insertedData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('خطأ:', error);
    return new Response(
      JSON.stringify({ error: 'خطأ داخلي', details: error.message }),
      { headers: corsHeaders, status: 500 }
    );
  }
});