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
    const { webhook_url, event, test_data } = body;

    if (!webhook_url) {
      return new Response(
        JSON.stringify({ success: false, error: 'مطلوب رابط الويب هوك' }),
        { headers: corsHeaders, status: 400 }
      );
    }

    console.log('إرسال طلب اختبار للويب هوك:', { webhook_url, event, test_data });

    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: event,
        data: test_data
      }),
    });

    const responseText = await response.text();
    console.log('استجابة الويب هوك:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText
    });

    if (response.ok) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تم إرسال رسالة الاختبار بنجاح',
          webhookResponse: {
            status: response.status,
            body: responseText
          }
        }),
        { headers: corsHeaders }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'فشل في الاتصال بالويب هوك',
          webhookResponse: {
            status: response.status,
            statusText: response.statusText,
            body: responseText
          }
        }),
        { headers: corsHeaders, status: 400 }
      );
    }

  } catch (error) {
    console.error('خطأ في اختبار الويب هوك:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'خطأ في الاتصال بالويب هوك', 
        details: error.message 
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
});