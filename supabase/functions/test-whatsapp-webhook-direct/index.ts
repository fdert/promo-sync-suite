import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  console.log('🧪 اختبار مباشر لـ webhook WhatsApp');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // رابط الـ webhook المباشر
    const webhookUrl = 'https://n8n.srv894347.hstgr.cloud/webhook/ca719409-ac29-485a-99d4-3b602978eace';
    
    // بيانات تجريبية
    const testPayload = {
      phone: '+966535983261',
      message: 'رسالة اختبار مباشرة من النظام\n\nهذه رسالة تجريبية للتأكد من عمل webhook WhatsApp.\n\nالتاريخ: ' + new Date().toLocaleString('ar-SA'),
      customer_name: 'عميل تجريبي'
    };

    console.log('📤 إرسال بيانات إلى webhook:');
    console.log('URL:', webhookUrl);
    console.log('البيانات:', JSON.stringify(testPayload, null, 2));

    // إرسال POST request إلى الـ webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Edge-Function',
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    
    console.log('📥 استجابة webhook:');
    console.log('Status:', response.status);
    console.log('StatusText:', response.statusText);
    console.log('Response:', responseText);

    // طباعة جميع headers الاستجابة
    console.log('📋 Headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    if (response.ok) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'تم إرسال الرسالة التجريبية بنجاح إلى webhook',
          webhook_status: response.status,
          webhook_response: responseText,
          test_data: testPayload
        }),
        { headers: corsHeaders }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'فشل في الوصول إلى webhook',
          webhook_status: response.status,
          webhook_response: responseText,
          test_data: testPayload
        }),
        { headers: corsHeaders, status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'خطأ في الاتصال بـ webhook',
        details: error.message
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
});