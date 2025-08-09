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
    const { phone_number, message } = await req.json();
    
    console.log('Received request:', { phone_number, message: message?.substring(0, 100) });

    if (!phone_number || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing phone_number or message' }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // حفظ الرسالة في قاعدة البيانات فقط
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: phone_number,
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

    console.log('Message saved successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تم حفظ الرسالة بنجاح وسيتم إرسالها قريباً'
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