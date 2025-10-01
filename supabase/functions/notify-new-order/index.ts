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

    // حفظ الرسالة في قاعدة البيانات
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

    // إرسال مباشر عبر follow_up_webhook_url إذا كان موجوداً
    if (settings.follow_up_webhook_url) {
      try {
        console.log('Sending via follow_up_webhook:', settings.follow_up_webhook_url);
        
        const payload = {
          event: 'whatsapp_message_send',
          data: {
            to: settings.whatsapp_number,
            phone: settings.whatsapp_number,
            phoneNumber: settings.whatsapp_number,
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

        const webhookResp = await fetch(settings.follow_up_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (webhookResp.ok) {
          console.log('✅ Sent via follow_up_webhook successfully');
          
          if (messageId) {
            await supabase
              .from('whatsapp_messages')
              .update({ 
                status: 'sent', 
                sent_at: new Date().toISOString() 
              })
              .eq('id', messageId);
          }
        } else {
          console.warn('Follow_up_webhook failed, keeping pending');
        }
      } catch (webhookError) {
        console.error('Error sending via follow_up_webhook:', webhookError);
      }
    } else {
      // الطريقة العادية: البحث عن webhooks النشطة
      const { data: webhooks, error: webhookError } = await supabase
        .from('webhook_settings')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (webhookError) {
        console.warn('Failed to fetch webhooks, keeping message pending:', webhookError);
      }

      const phoneNumber = settings.whatsapp_number;
      const phoneWithPlus = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      const phoneWithoutPlus = phoneNumber.replace('+', '');

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

          if (resp.ok) {
            sent = true;
            usedWebhookId = w.id;
            break;
          } else {
            lastError = `${resp.status} ${resp.statusText}`;
            continue;
          }
        } catch (sendErr) {
          lastError = String(sendErr);
          continue;
        }
      }

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
