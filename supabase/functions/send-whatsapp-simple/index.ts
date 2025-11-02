import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhatsAppRequest {
  phone: string;
  message: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing WhatsApp message request...');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody = await req.text();
    console.log('Raw request body:', requestBody);
    
    let requestData: WhatsAppRequest;
    try {
      requestData = JSON.parse(requestBody);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { phone, message } = requestData;
    
    if (!phone || !message) {
      console.error('Missing phone or message in request');
      return new Response(
        JSON.stringify({ error: 'Phone and message are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Sending message to: ${phone}`);
    console.log(`Message content length: ${message.length}`);

    // Clean phone number (remove non-digits except +)
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    console.log(`Cleaned phone: ${cleanPhone}`);

    // Insert message into whatsapp_messages table
    const { data: messageData, error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert([
        {
          to_number: cleanPhone,
          message_content: message,
          status: 'pending',
          message_type: 'text',
          from_number: 'system',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to queue message for sending', details: insertError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Message queued successfully:', messageData.id);

    // البحث عن webhook settings مع الأولوية للتقارير المالية + تهيئة بديل
    let primaryWebhook: any = null;
    let fallbackWebhook: any = null;

    console.log('🔍 البحث عن ويب هوك التقارير المالية...');

    // جلب ويب هوك تقارير العملاء المدينين (الأحدث)
    const { data: outstandingBalanceWebhook } = await supabase
      .from('webhook_settings')
      .select('webhook_url, webhook_type, webhook_name, is_active')
      .eq('webhook_type', 'outstanding_balance_report')
      .eq('is_active', true)
      .maybeSingle();

    // جلب ويب هوك التقارير المالية (القديم)
    const { data: accountSummaryWebhook } = await supabase
      .from('webhook_settings')
      .select('webhook_url, webhook_type, webhook_name, is_active')
      .eq('webhook_type', 'account_summary')
      .eq('is_active', true)
      .maybeSingle();

    // جلب ويب هوك الإرسال العام (outgoing)
    const { data: outgoingWebhook } = await supabase
      .from('webhook_settings')
      .select('webhook_url, webhook_type, webhook_name, is_active')
      .eq('webhook_type', 'outgoing')
      .eq('is_active', true)
      .maybeSingle();

    // قائمة بكل ويبهوكات الإرسال العامة لتجربة عدة مسارات عند الفشل
    const { data: outgoingList } = await supabase
      .from('webhook_settings')
      .select('webhook_url, webhook_type, webhook_name, is_active')
      .eq('webhook_type', 'outgoing')
      .eq('is_active', true);

    const isTestUrl = (url?: string) => !!url && url.includes('/webhook-test/');
    const nonTestOutgoing = (outgoingList || []).filter((w: any) => w.webhook_url && !isTestUrl(w.webhook_url));

    // تحديد الأساسي والاحتياطي مع تفضيل عدم استخدام روابط test
    // الأولوية: outstanding_balance_report > account_summary > outgoing
    if (outstandingBalanceWebhook?.webhook_url && !isTestUrl(outstandingBalanceWebhook.webhook_url)) {
      primaryWebhook = outstandingBalanceWebhook;
      fallbackWebhook = accountSummaryWebhook?.webhook_url ? accountSummaryWebhook : (outgoingWebhook?.webhook_url ? outgoingWebhook : null);
      console.log('✅ استخدام ويب هوك تقارير العملاء المدينين كخيار أساسي:', primaryWebhook.webhook_name);
    } else if (accountSummaryWebhook?.webhook_url && !isTestUrl(accountSummaryWebhook.webhook_url)) {
      primaryWebhook = accountSummaryWebhook;
      fallbackWebhook = outgoingWebhook?.webhook_url ? outgoingWebhook : null;
      console.log('✅ استخدام ويب هوك التقارير المالية كخيار أساسي:', primaryWebhook.webhook_name);
    } else if (outgoingWebhook?.webhook_url) {
      primaryWebhook = outgoingWebhook;
      fallbackWebhook = accountSummaryWebhook?.webhook_url ? accountSummaryWebhook : (outstandingBalanceWebhook?.webhook_url ? outstandingBalanceWebhook : null);
      console.log('ℹ️ سيتم استخدام outgoing كخيار أساسي (رابط التقارير في وضع test أو غير متوفر):', primaryWebhook.webhook_name);
    } else if (accountSummaryWebhook?.webhook_url) {
      primaryWebhook = accountSummaryWebhook;
      console.log('⚠️ لا يوجد outgoing. سيتم استخدام التقارير المالية كخيار أساسي:', primaryWebhook.webhook_name);
    } else if (outstandingBalanceWebhook?.webhook_url) {
      primaryWebhook = outstandingBalanceWebhook;
      console.log('⚠️ لا يوجد outgoing. سيتم استخدام تقارير العملاء المدينين كخيار أساسي:', primaryWebhook.webhook_name);
    }

    console.log('📡 الويب هوك الأساسي:', {
      name: primaryWebhook?.webhook_name,
      type: primaryWebhook?.webhook_type,
      hasUrl: !!primaryWebhook?.webhook_url,
      url: primaryWebhook?.webhook_url ? 'متوفر' : 'مفقود'
    });

    if (!primaryWebhook?.webhook_url) {
      console.error('❌ خطأ: لا يوجد ويب هوك نشط - No active webhook found');
      return new Response(
        JSON.stringify({ 
          error: 'No webhook configured',
          details: 'لا يوجد ويب هوك مكون بشكل صحيح'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    console.log('📡 استخدام ويب هوك:', primaryWebhook.webhook_name, `(${primaryWebhook.webhook_type})`);

    // إعداد بيانات الرسالة للإرسال (يشمل حقول توافق إضافية)
    const messagePayload = {
      messaging_product: "whatsapp",
      to: cleanPhone.replace('+', ''),
      type: "text",
      text: {
        body: message
      },
      // توافق مع بعض تدفقات n8n القديمة
      phone: cleanPhone,
      to_number: cleanPhone,
      message,
      text_body: message
    };

    console.log('Sending message payload:', JSON.stringify(messagePayload, null, 2));

    // إرسال الرسالة عبر webhook (مع آلية بديلة عند الفشل)
    let usedWebhook = primaryWebhook;
    let response = await fetch(primaryWebhook.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messagePayload)
    });

    let responseData = await response.text();
    console.log('Webhook response (primary):', response.status, responseData);

    // في حال الفشل مع ويب هوك التقارير المالية، جرّب fallback outgoing إن وجد
    if (!response.ok && (primaryWebhook?.webhook_type === 'account_summary' || primaryWebhook?.webhook_type === 'outstanding_balance_report') && fallbackWebhook?.webhook_url && fallbackWebhook.webhook_url !== primaryWebhook.webhook_url) {
      console.warn('⚠️ فشل الإرسال عبر ويب هوك التقارير المالية. تجربة ويب هوك بديل...');
      usedWebhook = fallbackWebhook;
      response = await fetch(fallbackWebhook.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messagePayload)
      });
      responseData = await response.text();
      console.log('Webhook response (fallback):', response.status, responseData);
    }

    // إذا مازال فاشلاً، جرّب بقية ويبهوكات outgoing غير التجريبية
    if (!response.ok && Array.isArray(nonTestOutgoing)) {
      for (const w of nonTestOutgoing) {
        if (w.webhook_url === usedWebhook?.webhook_url) continue;
        console.warn('🔁 تجربة ويب هوك بديل:', w.webhook_name);
        const altRes = await fetch(w.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messagePayload)
        });
        const altBody = await altRes.text();
        console.log('Webhook response (alt):', altRes.status, altBody);
        if (altRes.ok) {
          usedWebhook = w;
          response = altRes;
          responseData = altBody;
          break;
        }
      }
    }

    const newStatus = response.ok ? 'sent' : 'failed';

    // تحديث حالة الرسالة
    const { error: updateError } = await supabase
      .from('whatsapp_messages')
      .update({ 
        status: newStatus,
        replied_at: new Date().toISOString()
      })
      .eq('id', messageData.id);

    if (updateError) {
      console.error('Error updating message:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: newStatus === 'sent',
        message: newStatus === 'sent' ? 'تم إرسال الرسالة بنجاح' : 'فشل الإرسال عبر جميع الويب هوكات المتاحة',
        messageId: messageData.id,
        status: newStatus,
        usedWebhook: usedWebhook?.webhook_type || 'unknown'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-whatsapp-simple:', error);
    return new Response(
      JSON.stringify({ 
        error: 'فشل في إرسال الرسالة',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});