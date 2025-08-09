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
    const body = await req.json();
    console.log('Mock WhatsApp webhook received:', body);
    
    // محاكاة استجابة نجح لإرسال الواتساب
    const mockResponse = {
      messaging_product: "whatsapp",
      contacts: [{
        input: body.to,
        wa_id: body.to
      }],
      messages: [{
        id: `mock_msg_${Date.now()}`,
        message_status: "accepted"
      }]
    };
    
    console.log('Mock WhatsApp response:', mockResponse);
    
    return new Response(
      JSON.stringify(mockResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Mock webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Mock webhook failed', details: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});