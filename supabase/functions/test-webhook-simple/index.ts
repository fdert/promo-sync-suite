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
    // اختبار الويب هوك الجديد مباشرة
    const testMessage = {
      customerPhone: '+966535983261',
      customerName: 'اختبار العميل',
      message: 'رسالة اختبار للويب هوك الجديد - ' + new Date().toLocaleString('ar-SA'),
      notificationType: 'test'
    };

    console.log('إرسال رسالة اختبار للويب هوك:', testMessage);

    const response = await fetch('https://n8n.srv894347.hstgr.cloud/webhook-test/ca719409-ac29-485a-99d4-3b602978eace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
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