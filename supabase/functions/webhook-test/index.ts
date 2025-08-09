const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('بدء اختبار الويب هوك...');
    
    const body = await req.json();
    console.log('البيانات المستلمة:', body);
    
    const { webhook_url, event, test_data } = body;

    if (!webhook_url) {
      console.error('رابط الويب هوك مطلوب');
      return new Response(
        JSON.stringify({ success: false, error: 'رابط الويب هوك مطلوب' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('إرسال اختبار إلى:', webhook_url);

    const testPayload = {
      event: event || 'test',
      data: test_data || {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'رسالة اختبار من النظام'
      }
    };

    console.log('البيانات المرسلة:', testPayload);

    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Webhook-Test/1.0',
      },
      body: JSON.stringify(testPayload),
    });

    const responseText = await response.text();
    
    console.log('الاستجابة:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText
    });

    return new Response(
      JSON.stringify({ 
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        response: responseText,
        message: response.ok ? 'تم إرسال الاختبار بنجاح' : 'فشل في إرسال الاختبار'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('خطأ في اختبار الويب هوك:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'خطأ في معالجة الطلب',
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});