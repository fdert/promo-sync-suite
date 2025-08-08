import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// إنشاء عميل Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    console.log('معالجة رسائل الواتس آب المعلقة...');

    // جلب الرسائل المعلقة
    const { data: pendingMessages, error: fetchError } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error('خطأ في جلب الرسائل المعلقة:', fetchError);
      throw fetchError;
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      console.log('لا توجد رسائل معلقة');
      return new Response(
        JSON.stringify({ message: 'No pending messages to process' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    console.log(`تم العثور على ${pendingMessages.length} رسائل معلقة`);

    const results = [];

    // معالجة كل رسالة
    for (const message of pendingMessages) {
      try {
        console.log(`معالجة الرسالة إلى ${message.to_number}`);

        // IMPORTANT: هنا يجب ربط الرسالة بخدمة واتس آب حقيقية
        // حالياً سنضع placeholder لخدمة الواتس آب
        
        // محاكاة إرسال الرسالة (يجب استبدالها بخدمة واتس آب حقيقية)
        const success = await sendToWhatsAppService(message);

        let newStatus = success ? 'sent' : 'failed';

        // تحديث حالة الرسالة
        const updateData: any = { 
          status: newStatus,
          updated_at: new Date().toISOString()
        };
        
        // إضافة sent_at إذا تم الإرسال بنجاح
        if (success) {
          updateData.sent_at = new Date().toISOString();
        }
        
        const { error: updateError } = await supabase
          .from('whatsapp_messages')
          .update(updateData)
          .eq('id', message.id);

        if (updateError) {
          console.error(`خطأ في تحديث الرسالة ${message.id}:`, updateError);
        }

        results.push({
          message_id: message.id,
          to_number: message.to_number,
          status: newStatus
        });

        console.log(`تم إرسال الرسالة ${message.id} بحالة: ${newStatus}`);

        // تأخير قصير بين الرسائل
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (messageError) {
        console.error(`خطأ في معالجة الرسالة ${message.id}:`, messageError);
        
        // تحديث حالة الرسالة إلى failed
        await supabase
          .from('whatsapp_messages')
          .update({ status: 'failed' })
          .eq('id', message.id);

        results.push({
          message_id: message.id,
          to_number: message.to_number,
          status: 'failed',
          error: messageError.message
        });
      }
    }

    console.log('اكتملت المعالجة:', results);

    return new Response(
      JSON.stringify({ 
        success: true,
        processed_count: results.length,
        results: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('خطأ عام:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process whatsapp queue', 
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// دالة مساعدة لإرسال الرسائل إلى خدمة الواتس آب عبر n8n
async function sendToWhatsAppService(message: any): Promise<boolean> {
  try {
    console.log(`📱 إرسال رسالة واتس آب:`);
    console.log(`إلى: ${message.to_number}`);
    console.log(`النص: ${message.message_content}`);
    
    // تحديد نوع الـ webhook حسب محتوى الرسالة
    let webhookType = 'outgoing'; // افتراضي للطلبات العادية
    
    // إذا كانت الرسالة تحتوي على رابط جوجل أو كلمة تقييم، استخدم ويب هوك التقييمات
    if (message.message_content?.includes('google.com') || 
        message.message_content?.includes('تقييم') ||
        message.message_content?.includes('جوجل') ||
        message.message_content?.includes('خرائط جوجل') ||
        message.message_content?.includes('writereview') ||
        message.message_content?.includes('نرجو منك تقييم') ||
        message.message_content?.includes('نرجو تقييم')) {
      webhookType = 'evaluation';
      console.log('🌟 رسالة تقييم تم اكتشافها - استخدام ويب هوك التقييمات');
    }
    
    // جلب الـ webhook المناسب من قاعدة البيانات
    let { data: webhooks, error: webhookError } = await supabase
      .from('webhook_settings')
      .select('*')
      .eq('is_active', true)
      .eq('webhook_type', webhookType);

    // إذا لم يوجد ويب هوك للتقييمات، جرب ويب هوك الطلبات كبديل
    if ((!webhooks || webhooks.length === 0) && webhookType === 'evaluation') {
      console.log('⚠️ لا يوجد ويب هوك للتقييمات، جاري المحاولة مع ويب هوك الطلبات...');
      const { data: fallbackWebhooks, error: fallbackError } = await supabase
        .from('webhook_settings')
        .select('*')
        .eq('is_active', true)
        .eq('webhook_type', 'outgoing');
      
      webhooks = fallbackWebhooks;
      webhookError = fallbackError;
    }

    if (webhookError) {
      console.error('خطأ في جلب الـ webhooks:', webhookError);
      return false;
    }

    if (!webhooks || webhooks.length === 0) {
      console.error('لا يوجد webhook نشط للإرسال');
      return false;
    }

    // استخدام أول webhook نشط
    const webhook = webhooks[0];
    console.log(`📡 استخدام ويب هوك: ${webhook.webhook_name} (${webhook.webhook_type})`);
    
    // إعداد payload للإرسال لـ n8n
    const payload = {
      to: message.to_number,
      phone: message.to_number,
      phoneNumber: message.to_number,
      message: message.message_content,
      messageText: message.message_content,
      text: message.message_content,
      type: 'text',
      message_type: 'text',
      timestamp: Math.floor(Date.now() / 1000),
      customer_id: message.customer_id
    };

    console.log('إرسال للـ webhook:', webhook.webhook_url);
    console.log('البيانات المرسلة:', JSON.stringify(payload, null, 2));

    // إرسال للـ webhook
    const response = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const success = response.ok;
    console.log(`حالة الاستجابة: ${response.status}`);
    
    if (success) {
      const responseText = await response.text();
      console.log('استجابة الـ webhook:', responseText);
    } else {
      console.error('فشل إرسال للـ webhook:', response.status, response.statusText);
    }

    return success;
    
  } catch (error) {
    console.error('خطأ في إرسال الرسالة للواتس آب:', error);
    return false;
  }
}