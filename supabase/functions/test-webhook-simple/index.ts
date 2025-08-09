import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  console.log('Request received:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing webhook test request...');
    
    let body;
    try {
      body = await req.json();
      console.log('Request body parsed:', body);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'خطأ في تحليل البيانات المرسلة' }),
        { headers: corsHeaders, status: 400 }
      );
    }

    const { webhook_url, event, test_data } = body;

    if (!webhook_url) {
      console.error('Missing webhook_url');
      return new Response(
        JSON.stringify({ success: false, error: 'مطلوب رابط الويب هوك' }),
        { headers: corsHeaders, status: 400 }
      );
    }

    console.log('إرسال طلب اختبار للويب هوك:', { webhook_url, event, test_data });

    const payload = {
      event: event,
      data: test_data
    };

    console.log('Payload to send:', JSON.stringify(payload));

    let response;
    try {
      response = await fetch(webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Supabase-Webhook-Test/1.0',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'خطأ في الاتصال بالويب هوك',
          details: fetchError.message
        }),
        { headers: corsHeaders, status: 500 }
      );
    }

    let responseText = '';
    try {
      responseText = await response.text();
    } catch (textError) {
      console.error('Error reading response text:', textError);
      responseText = 'خطأ في قراءة الاستجابة';
    }

    console.log('استجابة الويب هوك:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText
    });

    if (response.ok) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تم إرسال رسالة الاختبار بنجاح',
          webhookResponse: {
            status: response.status,
            statusText: response.statusText,
            body: responseText,
            headers: Object.fromEntries(response.headers.entries())
          }
        }),
        { headers: corsHeaders }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `فشل في الاتصال بالويب هوك - حالة HTTP: ${response.status}`,
          webhookResponse: {
            status: response.status,
            statusText: response.statusText,
            body: responseText,
            headers: Object.fromEntries(response.headers.entries())
          }
        }),
        { headers: corsHeaders, status: 200 } // Return 200 to avoid double error handling
      );
    }

  } catch (error) {
    console.error('خطأ عام في اختبار الويب هوك:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'خطأ داخلي في الخادم', 
        details: error.message 
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
});