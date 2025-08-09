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
    const { customer_phone, customer_name, message } = await req.json();
    
    console.log('Received account summary request:', { 
      customer_phone, 
      customer_name, 
      message: message?.substring(0, 100) 
    });

    if (!customer_phone || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing customer_phone or message' }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // حفظ الرسالة في قاعدة البيانات للإرسال
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: customer_phone,
        message_type: 'text',
        message_content: message,
        status: 'pending',
        is_reply: false,
      });

    if (insertError) {
      console.error('Database error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Database error', details: insertError.message }),
        { headers: corsHeaders, status: 500 }
      );
    }

    console.log('Account summary message saved successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تم حفظ رسالة الملخص المالي بنجاح وسيتم إرسالها قريباً'
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error', details: error.message }),
      { headers: corsHeaders, status: 500 }
    );
  }
});