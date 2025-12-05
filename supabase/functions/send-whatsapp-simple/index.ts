import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhatsAppRequest {
  phone?: string;
  phone_number?: string;
  message: string;
  webhook_type?: string;
  strict?: boolean;
  template_vars?: Record<string, any>;
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

    const { phone, phone_number, message, webhook_type, strict } = requestData as WhatsAppRequest & { strict?: boolean };
    
    // قبول phone أو phone_number
    const phoneToUse = phone_number || phone;
    
    const isOutstanding = webhook_type === 'outstanding_balance_report';
    const strictRequested = isOutstanding ? false : !!strict;
    
    if (!phoneToUse || !message) {
      console.error('Missing phone or message in request', { phone, phone_number, message: message ? 'present' : 'missing' });
      return new Response(
        JSON.stringify({ error: 'Phone and message are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Sending message to: ${phoneToUse}`);
    console.log(`Message content length: ${message.length}`);

    // Clean phone number (remove non-digits except +)
    const cleanPhone = phoneToUse.replace(/[^\d+]/g, '');
    console.log(`Cleaned phone: ${cleanPhone}`);

    // Insert message into whatsapp_messages table with correct message_type
    const { data: messageData, error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert([
        {
          to_number: cleanPhone,
          message_content: message,
          status: 'pending',
          message_type: webhook_type || 'text',
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

    // البحث عن webhook settings مع أولوية للويب هوك المحدد
    let primaryWebhook: any = null;
    let fallbackWebhook: any = null;

    console.log('🔍 نوع الويب هوك المطلوب:', webhook_type || 'غير محدد');

    // إذا تم تحديد webhook_type، ابحث عنه أولاً
    if (webhook_type) {
      const { data: requestedWebhook } = await supabase
        .from('webhook_settings')
        .select('webhook_url, webhook_type, webhook_name, is_active')
        .eq('webhook_type', webhook_type)
        .eq('is_active', true)
        .maybeSingle();

      if (requestedWebhook?.webhook_url) {
        primaryWebhook = requestedWebhook;
        console.log('✅ تم العثور على الويب هوك المطلوب:', primaryWebhook.webhook_name);
      } else {
        console.warn('❌ لم يتم العثور على ويب هوك مطابق لنوع:', webhook_type);
        if (strictRequested) {
          return new Response(
            JSON.stringify({ 
              error: 'Specified webhook type not configured',
              details: webhook_type 
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }
    }

    // إذا لم يتم العثور على ويب هوك محدد، استخدم الترتيب الافتراضي
    if (!primaryWebhook) {
      console.log('🔍 البحث عن ويب هوك بديل...');

      // جلب ويب هوك التقارير المالية
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

      // تحديد الأساسي والاحتياطي
      if (accountSummaryWebhook?.webhook_url) {
        primaryWebhook = accountSummaryWebhook;
        fallbackWebhook = outgoingWebhook?.webhook_url ? outgoingWebhook : null;
        console.log('✅ استخدام ويب هوك التقارير المالية كخيار أساسي:', primaryWebhook.webhook_name);
      } else if (outgoingWebhook?.webhook_url) {
        primaryWebhook = outgoingWebhook;
        console.log('ℹ️ سيتم استخدام outgoing كخيار أساسي:', primaryWebhook.webhook_name);
      }
    }

    // جلب قائمة ويبهوكات بديلة للمحاولة عند الفشل
    const { data: allActiveWebhooks } = await supabase
      .from('webhook_settings')
      .select('webhook_url, webhook_type, webhook_name, is_active')
      .eq('is_active', true);

    const fallbackWebhooks = (allActiveWebhooks || []).filter((w: any) => 
      w.webhook_url && w.webhook_url !== primaryWebhook?.webhook_url
    );

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

    // إعداد بيانات الرسالة للإرسال - بنفس البنية التي تعمل مع n8n
    // بناء على السجلات الناجحة، يجب إرسال البيانات داخل غلاف "data" مع event
    const timestamp = Math.floor(Date.now() / 1000);
    
    // إزالة + من الرقم لحقل msisdn (مطلوب لبعض تدفقات n8n)
    const phoneWithoutPlus = cleanPhone.replace('+', '');
    
    const messagePayload: Record<string, any> = {
      event: 'whatsapp_message_send',
      data: {
        // الحقول الأساسية التي يتوقعها n8n (مع علامة +)
        phone: cleanPhone,
        phoneNumber: cleanPhone,
        to: cleanPhone,
        
        // حقل msisdn بدون + (مستخدم في الرسائل الناجحة)
        msisdn: phoneWithoutPlus,
        
        // محتوى الرسالة
        message: message,
        messageText: message,
        text: message,
        
        // معلومات إضافية
        type: 'text',
        message_type: webhook_type || 'outgoing',
        message_id: messageData.id,
        from_number: 'system',
        timestamp: timestamp,
        test: false,
        source: 'send-whatsapp-simple'
      }
    };

    // تمرير متغيرات القالب إن وُجدت من الطلب
    const reqAny = requestData as any;
    if (reqAny.template_vars && typeof reqAny.template_vars === 'object') {
      messagePayload.data.template_vars = reqAny.template_vars;
      messagePayload.data.variables = reqAny.template_vars;
    }
    
    // إضافة متغيرات إضافية لرسائل تقرير المديونيات
    if (webhook_type === 'outstanding_balance_report') {
      messagePayload.data.is_financial_report = true;
      messagePayload.data.report_type = 'accounts_receivable';
      console.log('🏷️ تفعيل الإرسال عبر القالب outstanding_balance_report');
    }
 
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

    // If outstanding_balance_report points to a test URL, try published URL automatically
    if (!response.ok && isOutstanding && primaryWebhook?.webhook_url?.includes('/webhook-test/')) {
      try {
        const publishedUrl = primaryWebhook.webhook_url.replace('/webhook-test/', '/webhook/');
        if (publishedUrl !== primaryWebhook.webhook_url) {
          console.warn('🔁 404 on test webhook. Retrying with published URL:', publishedUrl);
          usedWebhook = { ...primaryWebhook, webhook_url: publishedUrl };
          const retryRes = await fetch(publishedUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messagePayload)
          });
          const retryBody = await retryRes.text();
          console.log('Webhook response (published):', retryRes.status, retryBody);
          if (retryRes.ok) {
            response = retryRes;
            responseData = retryBody;
          }
        }
      } catch (e) {
        console.error('Failed retrying published URL:', e);
      }
    }

    // If a specific webhook_type was requested, do NOT fallback to any other webhook
    if (strictRequested && !response.ok) {
      console.error('Requested webhook failed. Skipping fallbacks by request.', {
        requestedType: webhook_type,
        primaryType: primaryWebhook?.webhook_type,
        status: response.status,
        body: responseData
      });
      // Update message as failed and return error
      const { error: updateErrStrict } = await supabase
        .from('whatsapp_messages')
        .update({ status: 'failed' })
        .eq('id', messageData.id);
      if (updateErrStrict) console.error('Failed to mark message failed:', updateErrStrict);

      return new Response(
        JSON.stringify({
          success: false,
          message: 'فشل إرسال الرسالة عبر الويب هوك المطلوب',
          messageId: messageData.id,
          status: 'failed',
          usedWebhook: primaryWebhook?.webhook_type || 'unknown'
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // في حال الفشل مع ويب هوك التقارير المالية، جرّب fallback outgoing إن وجد (غير مفعّل عند تحديد نوع ويب هوك محدد)
    if (!strictRequested && !response.ok && primaryWebhook?.webhook_type === 'account_summary' && fallbackWebhook?.webhook_url && fallbackWebhook.webhook_url !== primaryWebhook.webhook_url) {
      console.warn('⚠️ فشل الإرسال عبر ويب هوك التقارير المالية. تجربة ويب هوك outgoing كبديل...');
      usedWebhook = fallbackWebhook;
      response = await fetch(fallbackWebhook.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messagePayload)
      });
      responseData = await response.text();
      console.log('Webhook response (fallback):', response.status, responseData);
    }

    // إذا مازال فاشلاً، جرّب بقية الويبهوكات البديلة عند تقارير المديونيات أيضًا
    if (!strictRequested && !response.ok && Array.isArray(fallbackWebhooks) && isOutstanding) {
      for (const w of fallbackWebhooks) {
        if (w.webhook_url === usedWebhook?.webhook_url) continue;
        console.warn('🔁 تجربة ويب هوك بديل لتقرير المديونيات:', w.webhook_name);
        const altRes = await fetch(w.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messagePayload)
        });
        const altBody = await altRes.text();
        console.log('Webhook response (alt-outstanding):', altRes.status, altBody);
        if (altRes.ok) {
          usedWebhook = w;
          response = altRes;
          responseData = altBody;
          break;
        }
        // إذا كان الويب هوك بديل اختبار، جرّب النسخة المنشورة تلقائيًا
        if (!altRes.ok && w.webhook_url?.includes('/webhook-test/')) {
          try {
            const publishedUrlAlt = w.webhook_url.replace('/webhook-test/', '/webhook/');
            if (publishedUrlAlt !== w.webhook_url) {
              console.warn('🔁 retry alt with published URL:', publishedUrlAlt);
              const retryAlt = await fetch(publishedUrlAlt, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(messagePayload)
              });
              const retryAltBody = await retryAlt.text();
              console.log('Webhook response (alt-published):', retryAlt.status, retryAltBody);
              if (retryAlt.ok) {
                usedWebhook = { ...w, webhook_url: publishedUrlAlt };
                response = retryAlt;
                responseData = retryAltBody;
                break;
              }
            }
          } catch (e) {
            console.error('Failed retrying alt published URL:', e);
          }
        }
      }
    }

    const newStatus = response.ok ? 'sent' : 'failed';

    // تسجيل في webhook_logs للتتبع
    try {
      await supabase.from('webhook_logs').insert({
        webhook_setting_id: null, // سنحدده لاحقاً إذا لزم الأمر
        request_payload: messagePayload,
        response_status: response.status,
        response_body: responseData,
        error_message: !response.ok ? `${response.status} - ${responseData}` : null
      });
      console.log('📝 تم تسجيل الطلب في webhook_logs');
    } catch (logError) {
      console.error('فشل تسجيل webhook_logs:', logError);
    }

    // تحديث حالة الرسالة
    const updateData: any = { status: newStatus };
    if (newStatus === 'sent') {
      updateData.sent_at = new Date().toISOString();
    }
    const { error: updateError } = await supabase
      .from('whatsapp_messages')
      .update(updateData)
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
        usedWebhook: usedWebhook?.webhook_type || 'unknown',
        webhook_name: usedWebhook?.webhook_name || null,
        http_status: response.status,
        response_body: responseData
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