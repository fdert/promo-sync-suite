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

// Normalize phone to E.164-like format: keep + and digits only, remove spaces and symbols
function normalizePhone(input?: string | null) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  // keep leading +, remove everything else that's not digit
  let cleaned = raw.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('00')) cleaned = '+' + cleaned.slice(2);
  if (!cleaned.startsWith('+')) {
    // if starts with country code (e.g. 966...), still add plus
    cleaned = '+' + cleaned;
  }
  const digits = cleaned.replace(/\D/g, '');
  return { e164: cleaned, digits };
}

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

        // إرسال الرسالة إلى خدمة الواتس آب
        const success = await sendToWhatsAppService(message);

        let newStatus = success ? 'sent' : 'failed';

        // تحديث حالة الرسالة (بدون updated_at لأن العمود غير موجود)
        const updateData: any = { 
          status: newStatus
        };
        
        // إضافة sent_at فقط إذا تم الإرسال بنجاح
        if (success) {
          updateData.sent_at = new Date().toISOString();
          console.log(`✅ تم إرسال الرسالة ${message.id} بنجاح - تحديث sent_at`);
        } else {
          updateData.error_message = 'فشل الإرسال إلى الويب هوك';
          console.log(`❌ فشل إرسال الرسالة ${message.id} - لا يوجد sent_at`);
        }
        
        const { error: updateError } = await supabase
          .from('whatsapp_messages')
          .update(updateData)
          .eq('id', message.id);

        if (updateError) {
          console.error(`خطأ في تحديث الرسالة ${message.id}:`, updateError);
        } else {
          // تحديث إحصائيات الحملة إذا كانت الرسالة جزء من حملة جماعية
          await updateCampaignStats(message.customer_id, success);
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
    
    // البحث عن أي webhook نشط متاح (أولوية للحملات الجماعية)
    console.log('🔍 البحث عن webhooks نشطة...');
    
    // جلب جميع الـ webhooks النشطة وترتيبها حسب الأولوية
    let { data: webhooks, error: webhookError } = await supabase
      .from('webhook_settings')
      .select('*')
      .eq('is_active', true)
      .order('webhook_type', { ascending: true }); // bulk_campaign سيكون أولاً أبجدياً

    console.log('📋 Webhooks المتاحة:', webhooks?.map(w => `${w.webhook_name} (${w.webhook_type})`));

    // جلب إعدادات متابعة لتحديد رقم إدارة المتابعة
    const { data: fuSettings } = await supabase
      .from('follow_up_settings')
      .select('whatsapp_number')
      .single();

    if (!webhooks || webhooks.length === 0) {
      console.error('❌ لا يوجد أي webhook نشط في النظام');
      console.log('💡 تحقق من إعدادات الـ webhooks في قسم إدارة الـ webhooks');
      
      // استعلام تشخيصي لمعرفة حالة جميع الـ webhooks
      const { data: allWebhooks } = await supabase
        .from('webhook_settings')
        .select('webhook_name, webhook_type, is_active, webhook_url');
      
      console.log('🔧 جميع الـ webhooks في النظام:', allWebhooks);
      return false;
    }

    // اختيار الـ webhook المناسب
    let selectedWebhook = null;
    
    // اكتشاف ما إذا كانت هذه رسالة تقييم مرتبطة بطلب مكتمل عبر dedupe_key = evaluation:<order_id> أو evaluation_manual:<order_id>:<ts>
    const dedupeKey: string = message.dedupe_key || '';
    const isEvaluationForOrder = dedupeKey.startsWith('evaluation:') || dedupeKey.startsWith('evaluation_manual:');
    let evaluationOrderId: string | null = null;
    if (isEvaluationForOrder) {
      try {
        const parts = dedupeKey.split(':');
        evaluationOrderId = parts[1] || null;
        console.log('🧭 تم التعرف على رسالة تقييم لطلب:', evaluationOrderId, 'النوع:', parts[0]);
      } catch (_) {
        evaluationOrderId = null;
      }
    }
    
    // أولوية: إذا كانت الرسالة موجهة لرقم إدارة المتابعة، استخدم ويب هوك الطلبات العادية
    try {
      const adminNumber = String(fuSettings?.whatsapp_number || '').replace(/[^\d+]/g, '');
      const toNumberNormalized = String(message.to_number || '').replace(/[^\d+]/g, '');
      if (adminNumber && toNumberNormalized) {
        const adminDigits = adminNumber.replace(/^\+/, '');
        const toDigits = toNumberNormalized.replace(/^\+/, '');
        if (toDigits.endsWith(adminDigits)) {
          selectedWebhook = webhooks.find(w => w.webhook_type === 'outgoing');
          if (selectedWebhook) {
            console.log('🏢 الرسالة موجهة لإدارة المتابعة -> استخدام ويب هوك الطلبات العادية (outgoing)');
          }
        }
      }
    } catch (e) {
      console.warn('تعذر تطبيع رقم إدارة المتابعة:', e);
    }
    
    // إذا كانت رسالة تقييم مرتبطة بطلب -> استخدم ويب هوك "evaluation" إن توفر، وإلا فالطلبات العادية
    if (!selectedWebhook && isEvaluationForOrder) {
      const evalWebhook = webhooks.find(w => w.webhook_type === 'evaluation');
      selectedWebhook = evalWebhook || webhooks.find(w => w.webhook_type === 'outgoing');
      if (selectedWebhook) {
        console.log(evalWebhook
          ? '🌟 استخدام ويب هوك التقييمات لرسالة التقييم المرتبطة بالطلب المكتمل'
          : '🔁 استخدام ويب هوك الطلبات العادية (outgoing) لرسالة التقييم المرتبطة بالطلب المكتمل');
      }
    }
    
    // ثانياً: إذا كانت رسالة نقل مهمة، استخدام ويب هوك نقل المهام
    if (!selectedWebhook && message.message_type === 'task_transfer') {
      selectedWebhook = webhooks.find(w => w.webhook_type === 'task_transfer') 
        || webhooks.find(w => w.webhook_type === 'outgoing');
      if (selectedWebhook) {
        console.log(selectedWebhook.webhook_type === 'task_transfer'
          ? '📋 استخدام ويب هوك نقل المهام'
          : '🔁 استخدام ويب هوك الطلبات العادية لنقل المهمة');
      }
    }
    
    // ثالثاً: البحث عن webhook للحملات الجماعية
    if (!selectedWebhook) {
      selectedWebhook = webhooks.find(w => w.webhook_type === 'bulk_campaign');
    }
    
    if (selectedWebhook) {
      console.log('✅ تم العثور على ويب هوك الحملات الجماعية/الطلبات');
    } else {
      // ثالثاً: البحث حسب محتوى الرسالة للتقييمات (عام)
      if (message.message_content?.includes('google.com') || 
          message.message_content?.includes('تقييم') ||
          message.message_content?.includes('جوجل') ||
          message.message_content?.includes('خرائط جوجل') ||
          message.message_content?.includes('writereview') ||
          message.message_content?.includes('نرجو منك تقييم') ||
          message.message_content?.includes('نرجو تقييم')) {
        selectedWebhook = webhooks.find(w => w.webhook_type === 'evaluation');
        if (selectedWebhook) {
          console.log('🌟 استخدام ويب هوك التقييمات لرسالة التقييم');
        }
      }
      
      // رابعاً: البحث عن رسائل التقارير المالية
      if (!selectedWebhook && (message.message_content?.includes('تقرير مالي') || 
          message.message_content?.includes('مبلغ مستحق') ||
          message.message_content?.includes('طلبات غير مدفوعة') ||
          message.message_content?.includes('المبلغ المستحق') ||
          message.message_content?.includes('ملخص الحساب المالي'))) {
        // أولوية لاستخدام ويب هوك العملاء المدينين إن توفر
        selectedWebhook = webhooks.find(w => w.webhook_type === 'outstanding_balance_report')
          || webhooks.find(w => w.webhook_type === 'outgoing')
          || webhooks.find(w => w.webhook_type === 'bulk_campaign');
        if (selectedWebhook) {
          console.log(selectedWebhook.webhook_type === 'outstanding_balance_report'
            ? '💰 استخدام ويب هوك العملاء المدينين للتقرير المالي'
            : '💰 استخدام ويب هوك مناسب للتقرير المالي');
        }
      }
      
      // خامساً: استخدام أول webhook متاح
      if (!selectedWebhook) {
        selectedWebhook = webhooks[0];
        console.log(`🔄 استخدام أول webhook متاح: ${selectedWebhook.webhook_name}`);
      }
    }

    const webhook = selectedWebhook;

    if (webhookError) {
      console.error('خطأ في جلب الـ webhooks:', webhookError);
      return false;
    }

    if (!webhook) {
      console.error('❌ لم يتم العثور على أي webhook مناسب للإرسال');
      console.log('💡 تأكد من تفعيل webhook واحد على الأقل في إعدادات الـ webhooks');
      return false;
    }
    console.log(`📡 استخدام ويب هوك: ${webhook.webhook_name} (${webhook.webhook_type})`);
    
    // إعداد payload للإرسال لـ n8n
    let payload: any;

    if (isEvaluationForOrder && evaluationOrderId) {
      console.log('🧱 بناء payload لرسالة التقييم');
      
      // استخدام محتوى الرسالة الأصلي مباشرة (يحتوي على رمز التقييم)
      const textMessage = message.message_content;
      
      // جلب تفاصيل الطلب والعميل
      const { data: order } = await supabase
        .from('orders')
        .select(`id, order_number, total_amount, paid_amount, status, delivery_date,
                 customers:customer_id (name, phone, whatsapp),
                 service_types:service_type_id (name)`) 
        .eq('id', evaluationOrderId)
        .maybeSingle();

      const phoneRaw = String(message.to_number || order?.customers?.whatsapp || order?.customers?.phone || '').trim();
      const norm = normalizePhone(phoneRaw);
      const toE164 = norm.e164;
      const toDigits = norm.digits;

      // إذا كان الويب هوك من نوع evaluation نستخدم هيكل order_completed
      if (webhook.webhook_type === 'evaluation') {
        payload = {
          notification_type: 'order_completed',
          type: 'order_completed',
          source: 'evaluation_followup',
          is_evaluation: true,
          force_send: true,
          timestamp: Math.floor(Date.now() / 1000),
          order_id: order?.id || evaluationOrderId,
          order_number: order?.order_number,
          customer_name: order?.customers?.name,
          to: toE164,
          to_e164: toE164,
          to_digits: toDigits,
          phone: toE164,
          phone_e164: toE164,
          phone_digits: toDigits,
          phoneNumber: toE164,
          msisdn: toDigits,
          message: textMessage,
          messageText: textMessage,
          text: textMessage,
          service_name: order?.service_types?.name,
          description: '',
          amount: String(order?.total_amount ?? '0.00'),
          paid_amount: String(order?.paid_amount ?? '0.00'),
          remaining_amount: order && order.total_amount != null && order.paid_amount != null
            ? String(Number(order.total_amount) - Number(order.paid_amount))
            : '0.00',
          payment_type: 'غير محدد',
          status: String(order?.status || ''),
          priority: 'متوسطة',
          start_date: 'سيتم تحديده',
          due_date: 'سيتم تحديده',
          delivery_date: order?.delivery_date || undefined,
          order_items: '',
          payments_details: 'لا توجد دفعات مسجلة',
          payments: [],
          company_name: '',
          estimated_time: 'قريباً',
          progress: '0'
        };
      } else {
        // خلاف ذلك (outgoing أو أي نوع آخر) نستخدم هيكل الإرسال النصي القياسي المتوافق مع سير العمل
        console.log('↪️ استخدام هيكل whatsapp_message_send للإرسال');
        payload = {
          event: 'whatsapp_message_send',
          data: {
            to: toE164,
            phone: toE164,
            phoneNumber: toE164,
            msisdn: toDigits,
            message: textMessage,
            messageText: textMessage,
            text: textMessage,
            type: 'text',
            message_type: 'text',
            timestamp: Math.floor(Date.now() / 1000),
            customer_id: message.customer_id,
            message_id: message.id,
            from_number: message.from_number || 'system',
            is_evaluation: true,
            source: 'evaluation_manual',
            order_id: order?.id || evaluationOrderId,
            order_number: order?.order_number,
            test: false
          }
        };
      }

    } else {
      // الوضع الافتراضي: إرسال نصي بسيط
      payload = {
        event: 'whatsapp_message_send',
        data: {
          to: message.to_number,
          phone: message.to_number,
          phoneNumber: message.to_number,
          message: message.message_content,
          messageText: message.message_content,
          text: message.message_content,
          type: 'text',
          message_type: 'text',
          timestamp: Math.floor(Date.now() / 1000),
          customer_id: message.customer_id,
          message_id: message.id,
          from_number: message.from_number || 'system',
          test: false
        }
      };
    }

    console.log('إرسال للـ webhook:', webhook.webhook_url);
    console.log('البيانات المرسلة:', JSON.stringify(payload, null, 2));
    
    // اختبار الاتصال مع الويب هوك
    console.log('🔗 بدء اختبار الاتصال مع الويب هوك...');

    // إرسال للـ webhook
    const response = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    console.log(`حالة الاستجابة: ${response.status}`);
    console.log(`نص الحالة: ${response.statusText}`);
    
    if (response.ok) {
      const responseText = await response.text();
      console.log('✅ استجابة الـ webhook ناجحة:', responseText);
      
      // سجل في webhook_logs
      try {
        await supabase.from('webhook_logs').insert({
          webhook_setting_id: webhook.id,
          request_payload: payload,
          response_status: response.status,
          response_body: responseText,
          created_at: new Date().toISOString()
        });
        console.log('📝 تم تسجيل الويب هوك في قاعدة البيانات');
      } catch (logError) {
        console.warn('⚠️ فشل في تسجيل الويب هوك:', logError);
      }
      
      return true;
    } else {
      const errorText = await response.text();
      console.error(`❌ فشل إرسال للـ webhook: ${response.status} - ${response.statusText}`);
      console.error('تفاصيل الخطأ:', errorText);
      
      // سجل الخطأ في webhook_logs
      try {
        await supabase.from('webhook_logs').insert({
          webhook_setting_id: webhook.id,
          request_payload: payload,
          response_status: response.status,
          response_body: errorText,
          error_message: `${response.status} - ${response.statusText}`,
          created_at: new Date().toISOString()
        });
        console.log('📝 تم تسجيل خطأ الويب هوك في قاعدة البيانات');
      } catch (logError) {
        console.warn('⚠️ فشل في تسجيل خطأ الويب هوك:', logError);
      }
      
      return false;
    }
    
  } catch (error) {
    console.error('خطأ في إرسال الرسالة للواتس آب:', error);
    return false;
  }
}

// دالة مساعدة لتحديث إحصائيات الحملات الجماعية
async function updateCampaignStats(customer_id: any, success: boolean): Promise<void> {
  try {
    console.log(`🔍 البحث عن حملة للعميل ${customer_id}`);
    
    // البحث عن الحملة الجماعية المرتبطة بهذا العميل (أحدث حملة معلقة أو في المعالجة)
    const { data: campaignMessages, error: campaignError } = await supabase
      .from('bulk_campaign_messages')
      .select('campaign_id, status')
      .eq('customer_id', customer_id)
      .in('status', ['pending', 'queued'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (campaignError || !campaignMessages || campaignMessages.length === 0) {
      console.log(`ℹ️ لم يتم العثور على حملة للعميل ${customer_id}`);
      return;
    }

    const campaignMessage = campaignMessages[0];
    const campaignId = campaignMessage.campaign_id;
    
    console.log(`✅ تم العثور على الحملة ${campaignId} للعميل ${customer_id}`);

    // تحديث حالة الرسالة في جدول الحملة
    await supabase
      .from('bulk_campaign_messages')
      .update({ 
        status: success ? 'sent' : 'failed',
        sent_at: success ? new Date().toISOString() : null,
        error_message: success ? null : 'فشل الإرسال'
      })
      .eq('campaign_id', campaignId)
      .eq('customer_id', customer_id);

    // حساب الإحصائيات المحدثة للحملة
    const { data: stats } = await supabase
      .from('bulk_campaign_messages')
      .select('status')
      .eq('campaign_id', campaignId);

    if (stats) {
      const sentCount = stats.filter(s => s.status === 'sent').length;
      const failedCount = stats.filter(s => s.status === 'failed').length;
      const pendingCount = stats.filter(s => s.status === 'pending' || s.status === 'queued').length;
      const totalCount = stats.length;

      // تحديث إحصائيات الحملة
      const campaignStatus = pendingCount === 0 ? 'completed' : 'processing';
      
      await supabase
        .from('bulk_campaigns')
        .update({
          sent_count: sentCount,
          failed_count: failedCount,
          status: campaignStatus,
          completed_at: campaignStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', campaignId);

      console.log(`🔄 تحديث إحصائيات الحملة ${campaignId}: أُرسل ${sentCount}، فشل ${failedCount}، معلق ${pendingCount}`);

      // إرسال webhook للحملة المكتملة
      if (campaignStatus === 'completed') {
        await sendCampaignWebhook(campaignId, sentCount, failedCount, totalCount);
      }
    }

  } catch (error) {
    console.error('خطأ في تحديث إحصائيات الحملة:', error);
  }
}

// دالة إرسال webhook للحملات المكتملة
async function sendCampaignWebhook(campaignId: string, sentCount: number, failedCount: number, totalCount: number): Promise<void> {
  try {
    console.log(`📡 إرسال webhook للحملة المكتملة ${campaignId}`);

    // جلب بيانات الحملة
    const { data: campaign } = await supabase
      .from('bulk_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (!campaign) return;

    // البحث عن webhook للحملات الجماعية
    const { data: webhook } = await supabase
      .from('webhook_settings')
      .select('*')
      .eq('webhook_type', 'bulk_campaign')
      .eq('is_active', true)
      .single();

    if (!webhook) {
      console.log('⚠️ لم يتم العثور على webhook نشط للحملات الجماعية');
      return;
    }

    // إعداد البيانات للإرسال
    const webhookData = {
      campaign_id: campaignId,
      campaign_name: campaign.name,
      status: 'completed',
      total_recipients: totalCount,
      sent_count: sentCount,
      failed_count: failedCount,
      message_content: campaign.message_content,
      target_type: campaign.target_type,
      target_groups: campaign.target_groups || [],
      started_at: campaign.started_at,
      completed_at: campaign.completed_at,
      created_by: campaign.created_by,
      webhook_triggered_at: new Date().toISOString(),
      trigger_type: 'campaign_completed',
      success_rate: totalCount > 0 ? ((sentCount / totalCount) * 100).toFixed(2) : '0.00',
      platform: 'Lovable WhatsApp System',
      version: '1.0'
    };

    // إرسال للـ webhook
    const response = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Lovable-WhatsApp-Webhook/1.0'
      },
      body: JSON.stringify(webhookData)
    });

    // تسجيل النتيجة
    await supabase
      .from('webhook_logs')
      .insert({
        webhook_type: 'bulk_campaign',
        campaign_id: campaignId,
        webhook_url: webhook.webhook_url,
        trigger_type: 'campaign_completed',
        status: response.ok ? 'sent' : 'failed',
        response_data: webhookData,
        error_message: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
      });

    if (response.ok) {
      console.log(`✅ تم إرسال webhook الحملة بنجاح إلى ${webhook.webhook_url}`);
    } else {
      console.error(`❌ فشل إرسال webhook الحملة: ${response.status} - ${response.statusText}`);
    }

  } catch (error) {
    console.error('خطأ في إرسال webhook الحملة:', error);
  }
}