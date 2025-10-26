import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function normalizePhone(input?: string | null) {
  const raw = String(input || '').trim();
  if (!raw) return { e164: '', digits: '' };
  let cleaned = raw.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('00')) cleaned = '+' + cleaned.slice(2);
  if (!cleaned.startsWith('+')) cleaned = '+' + cleaned.replace(/\D/g, '');
  const digits = cleaned.replace(/\D/g, '');
  return { e164: cleaned, digits };
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { headers: corsHeaders, status: 405 });
  }

  try {
    const body = await req.json();
    console.log('📨 طلب إرسال تقييم مباشر:', body);

    const {
      to, // رقم المستقبل (اختياري؛ إن لم يُرسل سنحاول جلبه من قاعدة البيانات)
      message, // نص الرسالة النهائي (مفضل)
      evaluation_id,
      order_id,
      customer_id,
      source = 'evaluation_direct',
    } = body || {};

    if (!message && !evaluation_id && !order_id) {
      return new Response(
        JSON.stringify({ error: 'مطلوب على الأقل message أو evaluation_id/order_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // جلب بيانات التقييم/الطلب والعميل إذا لزم الأمر
    let finalMessage: string = message || '';
    let finalTo: string = to || '';
    let resolvedOrderId: string | null = order_id || null;
    let resolvedCustomerId: string | null = customer_id || null;
    let evaluationToken: string | null = null;
    let orderNumber: string | null = null;

    if (!finalTo || !finalMessage) {
      // حاول التحميل من evaluation
      if (evaluation_id) {
        const { data: ev } = await supabase
          .from('evaluations')
          .select(`id, evaluation_token, order_id, customer_id,
                   customers:customer_id (phone, whatsapp, name),
                   orders:order_id (order_number)`)
          .eq('id', evaluation_id)
          .maybeSingle();

        if (ev) {
          resolvedOrderId = resolvedOrderId || ev.order_id || null;
          resolvedCustomerId = resolvedCustomerId || ev.customer_id || null;
          evaluationToken = ev.evaluation_token || null;
          orderNumber = ev.orders?.order_number || null;
          const phone = ev.customers?.whatsapp || ev.customers?.phone || '';
          if (!finalTo) finalTo = phone;
          if (!finalMessage && ev.evaluation_token) {
            const code = String(ev.evaluation_token).slice(-5).toUpperCase();
            // ملاحظة: يمكن تمرير الرابط من الواجهة لتفادي تثبيت النطاق
            const link = `https://e5a7747a-0935-46df-9ea9-1308e76636dc.lovableproject.com/evaluation/${ev.evaluation_token}`;
            finalMessage = `🌟 عزيزنا العميل، نشكرك على تعاملك معنا\n\n` +
              `✅ تم اكتمال طلبك رقم: ${ev.orders?.order_number || ''}\n\n` +
              `نرجو تقييم تجربتك عبر الرابط التالي:\n${link}\n\n` +
              `رمز التقييم: ${code}\n\n` +
              `شاكرين لكم وقتكم`;
          }
        }
      }
    }

    if (!finalTo || !finalMessage) {
      return new Response(
        JSON.stringify({ error: 'لا يمكن تحديد رقم المرسل إليه أو بناء الرسالة' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const norm = normalizePhone(finalTo);
    if (!norm.e164) {
      return new Response(
        JSON.stringify({ error: 'رقم غير صالح' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // سجّل الرسالة أولاً للحصول على message_id
    const { data: inserted, error: insertErr } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: norm.e164,
        message_type: 'text',
        message_content: finalMessage,
        status: 'pending',
        customer_id: resolvedCustomerId,
        dedupe_key: resolvedOrderId ? `evaluation_direct:${resolvedOrderId}:${Date.now()}` : null,
      })
      .select()
      .maybeSingle();

    if (insertErr) {
      console.error('❌ فشل إدراج الرسالة:', insertErr);
      return new Response(
        JSON.stringify({ error: 'فشل حفظ الرسالة', details: insertErr.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const messageId = inserted?.id;

    // اختيار الويب هوك النشط المناسب (أولوية evaluation ثم outgoing)
    const { data: webhooks, error: webhookError } = await supabase
      .from('webhook_settings')
      .select('*')
      .eq('is_active', true);

    if (webhookError || !webhooks || webhooks.length === 0) {
      console.error('❌ لا يوجد webhooks نشطة');
      await supabase.from('whatsapp_messages').update({ status: 'failed', error_message: 'no_active_webhook' }).eq('id', messageId);
      return new Response(
        JSON.stringify({ error: 'لا يوجد webhooks نشطة' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    let selected = webhooks.find(w => w.webhook_type === 'evaluation') || webhooks.find(w => w.webhook_type === 'outgoing') || webhooks[0];

    console.log('✅ استخدام الويب هوك:', selected?.webhook_name, selected?.webhook_type, selected?.webhook_url);

    // إعداد payload متوافق مع سير عمل n8n القياسي
    const payload = {
      event: 'whatsapp_message_send',
      data: {
        to: norm.e164,
        phone: norm.e164,
        phoneNumber: norm.e164,
        msisdn: norm.digits,
        message: finalMessage,
        messageText: finalMessage,
        text: finalMessage,
        notification_type: 'evaluation',
        type: 'evaluation',
        message_type: 'text',
        timestamp: Math.floor(Date.now() / 1000),
        customer_id: resolvedCustomerId,
        message_id: messageId,
        from_number: 'system',
        is_evaluation: true,
        source,
        order_id: resolvedOrderId,
        order_number: orderNumber,
        evaluation_token: evaluationToken,
        test: false,
      }
    } as const;

    console.log('إرسال للـ webhook:', selected.webhook_url);
    console.log('البيانات المرسلة:', JSON.stringify(payload, null, 2));

    const resp = await fetch(selected.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const respText = await resp.text();
    console.log('استجابة الويب هوك:', resp.status, resp.statusText, respText);

    const success = resp.ok;

    const updateData: any = { status: success ? 'sent' : 'failed' };
    if (success) updateData.sent_at = new Date().toISOString();
    else updateData.error_message = `webhook_error_${resp.status}`;

    await supabase.from('whatsapp_messages').update(updateData).eq('id', messageId);

    return new Response(
      JSON.stringify({ success, message_id: messageId, webhook_status: resp.status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: success ? 200 : 500 }
    );
  } catch (error) {
    console.error('خطأ عام:', error);
    return new Response(
      JSON.stringify({ error: 'فشل الإرسال المباشر', details: error?.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});