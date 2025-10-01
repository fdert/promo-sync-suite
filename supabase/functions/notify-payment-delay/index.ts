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

    console.log('Checking for delayed payments...');

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

    if (!settings.notify_payment_delay || !settings.whatsapp_number) {
      console.log('Payment delay notification is disabled or no WhatsApp number configured');
      return new Response(
        JSON.stringify({ message: 'Notification disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // البحث عن العملاء الذين لديهم مستحقات متأخرة
    const { data: outstandingBalances, error: balancesError } = await supabase
      .from('customer_outstanding_balances')
      .select('*')
      .gt('outstanding_balance', 0)
      .limit(20);

    if (balancesError) {
      console.error('Failed to fetch outstanding balances:', balancesError);
      throw balancesError;
    }

    if (!outstandingBalances || outstandingBalances.length === 0) {
      console.log('No outstanding balances found');
      return new Response(
        JSON.stringify({ message: 'No outstanding balances' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${outstandingBalances.length} customers with outstanding balances`);

    // البحث عن الطلبات القديمة لكل عميل
    const paymentDelayDate = new Date();
    paymentDelayDate.setDate(paymentDelayDate.getDate() - settings.payment_delay_days);

    let notificationsSent = 0;

    for (const customer of outstandingBalances) {
      const { data: oldOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, created_at, total_amount')
        .eq('customer_id', customer.customer_id)
        .lt('created_at', paymentDelayDate.toISOString())
        .order('created_at', { ascending: true })
        .limit(1);

      if (ordersError || !oldOrders || oldOrders.length === 0) {
        continue;
      }

      const oldestOrder = oldOrders[0];
      const orderDate = new Date(oldestOrder.created_at).toLocaleDateString('ar-SA');

      const message = `💰 *تنبيه: تأخير في الدفعات*

👤 اسم العميل: ${customer.customer_name}
📱 رقم الواتساب: ${customer.whatsapp || 'غير متوفر'}
📞 رقم الهاتف: ${customer.phone || 'غير متوفر'}

💵 الرصيد المستحق: ${customer.outstanding_balance?.toFixed(2)} ريال
📦 أقدم طلب: ${oldestOrder.order_number}
📅 تاريخ الطلب: ${orderDate}
⏱️ مر على الطلب: ${settings.payment_delay_days}+ أيام

يرجى المتابعة مع العميل لتحصيل المستحقات.`;

      const { data: msgInserted, error: msgInsertError } = await supabase
        .from('whatsapp_messages')
        .insert({
          from_number: 'system',
          to_number: settings.whatsapp_number,
          message_type: 'payment_delay_notification',
          message_content: message,
          status: 'pending',
          dedupe_key: `payment_delay_${customer.customer_id}_${new Date().toISOString().split('T')[0]}`
        })
        .select('id')
        .single();

      if (msgInsertError) {
        console.error('Failed to insert payment delay notification:', msgInsertError);
        continue;
      }

      // إرسال مباشر عبر follow_up_webhook_url إذا كان موجوداً
      if (settings.follow_up_webhook_url) {
        try {
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
              message_type: 'payment_delay_notification',
              timestamp: Math.floor(Date.now() / 1000),
              from_number: 'system',
              customer_id: customer.customer_id
            }
          };

          const webhookResp = await fetch(settings.follow_up_webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (webhookResp.ok && msgInserted?.id) {
            await supabase
              .from('whatsapp_messages')
              .update({ 
                status: 'sent', 
                sent_at: new Date().toISOString() 
              })
              .eq('id', msgInserted.id);
          }
        } catch (webhookError) {
          console.error('Error sending via follow_up_webhook:', webhookError);
        }
      }

      notificationsSent++;
    }

    console.log(`Payment delay notifications created: ${notificationsSent}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${notificationsSent} notifications`,
        count: notificationsSent 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in notify-payment-delay function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
