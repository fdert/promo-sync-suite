import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 Bulk Campaign Webhook - Simple Test');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Request method:', req.method);
    
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body:', requestBody);
    } catch (e) {
      console.log('Could not parse JSON:', e);
      requestBody = {};
    }

    // بيانات تجريبية بسيطة
    const testData = {
      success: true,
      message: 'تم إرسال webhook تجريبي بنجاح',
      timestamp: new Date().toISOString(),
      data: requestBody
    };

    console.log('Sending response:', testData);

    return new Response(
      JSON.stringify(testData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('خطأ في معالجة الطلب:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});