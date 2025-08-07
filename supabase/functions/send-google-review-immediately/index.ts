import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();
    
    console.log('🚀 إرسال رسالة تقييم فورية للطلب:', orderId);

    // جلب بيانات الطلب والعميل
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        customers (
          id,
          name,
          whatsapp_number
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !orderData) {
      throw new Error('Order not found: ' + orderError?.message);
    }

    console.log('📋 بيانات الطلب:', {
      order_number: orderData.order_number,
      customer_name: orderData.customers?.name,
      customer_phone: orderData.customers?.whatsapp_number
    });

    // التحقق من وجود رقم واتساب
    if (!orderData.customers?.whatsapp_number) {
      throw new Error('No WhatsApp number found for customer');
    }

    // جلب إعدادات جوجل
    const { data: googleSettings } = await supabase
      .from('google_maps_settings')
      .select('place_id')
      .single();

    let reviewLink = '';
    if (googleSettings?.place_id) {
      reviewLink = `https://search.google.com/local/writereview?placeid=${googleSettings.place_id}`;
    }

    // إنشاء رسالة التقييم
    const reviewMessage = `مرحباً ${orderData.customers.name}! 🎉

✅ طلبك رقم: ${orderData.order_number} تم إكماله بنجاح!

🌟 نرجو منك تقييم تجربتك معنا على خرائط جوجل:
${reviewLink}

تقييمك مهم جداً لنا ويساعدنا على تحسين خدماتنا.

شكراً لاختيارك خدماتنا! 🙏`;

    console.log('📱 محتوى الرسالة:', reviewMessage);

    // جلب ويب هوك التقييمات
    const { data: evaluationWebhook } = await supabase
      .from('webhook_settings')
      .select('webhook_url, webhook_name')
      .eq('webhook_type', 'evaluation')
      .eq('is_active', true)
      .single();

    if (!evaluationWebhook?.webhook_url) {
      // استخدام ويب هوك الطلبات كبديل
      const { data: fallbackWebhook } = await supabase
        .from('webhook_settings')
        .select('webhook_url, webhook_name')
        .eq('webhook_type', 'outgoing')
        .eq('is_active', true)
        .single();
      
      if (!fallbackWebhook?.webhook_url) {
        throw new Error('No active webhook found');
      }
      
      console.log('⚠️ استخدام ويب هوك الطلبات كبديل');
    }

    const webhookUrl = evaluationWebhook?.webhook_url || fallbackWebhook?.webhook_url;
    console.log('📡 ويب هوك URL:', webhookUrl);

    // إعداد payload للإرسال
    const payload = {
      to: orderData.customers.whatsapp_number,
      phone: orderData.customers.whatsapp_number,
      phoneNumber: orderData.customers.whatsapp_number,
      message: reviewMessage,
      messageText: reviewMessage,
      text: reviewMessage,
      type: 'text',
      message_type: 'text',
      timestamp: Math.floor(Date.now() / 1000),
      customer_id: orderData.customers.id,
      order_id: orderId
    };

    console.log('📤 إرسال للويب هوك:', JSON.stringify(payload, null, 2));

    // إرسال فوري للويب هوك
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const webhookResult = await webhookResponse.text();
    console.log('📥 استجابة الويب هوك:', webhookResult);

    if (!webhookResponse.ok) {
      console.error('❌ فشل إرسال الويب هوك:', webhookResponse.status, webhookResult);
      throw new Error(`Webhook failed: ${webhookResponse.status} ${webhookResult}`);
    }

    // حفظ الرسالة في قاعدة البيانات مع حالة sent
    const { error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: orderData.customers.whatsapp_number,
        message_type: 'text',
        message_content: reviewMessage,
        status: 'sent',
        customer_id: orderData.customers.id
      });

    if (messageError) {
      console.error('خطأ في حفظ الرسالة:', messageError);
    }

    console.log('✅ تم إرسال رسالة التقييم بنجاح');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Review message sent successfully',
        webhook_response: webhookResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ خطأ في إرسال رسالة التقييم:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send review message', 
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});