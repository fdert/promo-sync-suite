import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { orderId, orderNumber, customerName, totalAmount } = await req.json();

    console.log('Processing new order notification:', { orderId, orderNumber, customerName });

    // جلب إعدادات المتابعة
    const { data: settings, error: settingsError } = await supabase
      .from('follow_up_settings')
      .select('*')
      .single();

    if (settingsError || !settings) {
      console.error('Failed to fetch follow-up settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch settings' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!settings.notify_new_order || !settings.whatsapp_number) {
      console.log('New order notification is disabled or no WhatsApp number configured');
      return new Response(
        JSON.stringify({ message: 'Notification disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // إنشاء رسالة الإشعار
    const message = `🎉 *طلب جديد*

📦 رقم الطلب: ${orderNumber}
👤 اسم العميل: ${customerName}
💰 المبلغ الإجمالي: ${totalAmount} ريال

⏰ تاريخ الإنشاء: ${new Date().toLocaleString('ar-SA')}

يرجى متابعة الطلب والتواصل مع العميل.`;

    // حفظ الرسالة في قاعدة البيانات ثم محاولة إرسالها فورًا عبر webhook
    const { data: insertedMsg, error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: settings.whatsapp_number,
        message_type: 'new_order_notification',
        message_content: message,
        status: 'pending',
        dedupe_key: `new_order_${orderId}_${Date.now()}`
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to insert WhatsApp message:', insertError);
      throw insertError;
    }

    const messageId = insertedMsg?.id;

    // البحث عن جميع webhooks النشطة ومحاولة الإرسال إليها بالتتابع
    const { data: webhooks, error: webhookError } = await supabase
      .from('webhook_settings')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (webhookError) {
      console.warn('Failed to fetch webhooks, keeping message pending:', webhookError);
    }

    // تجهيز الرقم بصيغتين للتأكد من التوافق
    const phoneNumber = settings.whatsapp_number;
    const phoneWithPlus = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    const phoneWithoutPlus = phoneNumber.replace('+', '');

    // ترتيب المحاولات: إعطاء أولوية ل outgoing ثم باقي الأنواع
    const candidates = (webhooks || []).sort((a: any, b: any) => {
      const pa = a.webhook_type === 'outgoing' ? 0 : 1;
      const pb = b.webhook_type === 'outgoing' ? 0 : 1;
      return pa - pb;
    });

    let sent = false;
    let usedWebhookId: string | null = null;
    let lastError: string | null = null;

    for (const w of candidates) {
      if (!w?.webhook_url) continue;

      try {
        console.log('Attempting to send via webhook:', {
          webhook_url: w.webhook_url,
          phoneWithPlus,
          phoneWithoutPlus
        });

        const payload = {
          event: 'whatsapp_message_send',
          data: {
            to: phoneWithPlus,
            phone: phoneWithPlus,
            phoneNumber: phoneWithPlus,
            phone_without_plus: phoneWithoutPlus,
            message: message,
            messageText: message,
            text: message,
            type: 'text',
            message_type: 'new_order_notification',
            timestamp: Math.floor(Date.now() / 1000),
            from_number: 'system',
            order_id: orderId,
            order_number: orderNumber,
            customer_name: customerName
          }
        };

        const resp = await fetch(w.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const ok = resp.ok;
        const respText = await resp.text().catch(() => '');

        console.log('Webhook response:', {
          status: resp.status,
          statusText: resp.statusText,
          ok,
          body: respText
        });

        if (ok) {
          sent = true;
          usedWebhookId = w.id;
          break; // لا داعي للمحاولة مع Webhook آخر
        } else {
          lastError = `${resp.status} ${resp.statusText} ${respText}`;
          console.warn('Webhook send failed, will try next active webhook');
          continue;
        }
      } catch (sendErr) {
        lastError = String(sendErr);
        console.error('Error sending webhook for new order notification:', sendErr);
        continue;
      }
    }

    // تحديث حالة الرسالة بناءً على نتيجة المحاولات
    const updateData: Record<string, any> = {
      status: sent ? 'sent' : 'pending',
      webhook_id: usedWebhookId,
      error_message: sent ? null : lastError,
    };
    if (sent) {
      updateData.sent_at = new Date().toISOString();
    }

    if (messageId) {
      await supabase.from('whatsapp_messages').update(updateData).eq('id', messageId);
    }

    if (sent) {
      console.log('New order notification sent via webhook successfully');
    } else if (!candidates.length) {
      console.log('No active webhook found; message remains pending');
    } else {
      console.warn('All active webhooks failed; message kept as pending for retry');
    }

    console.log('New order notification saved successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent or queued' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in notify-new-order function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
