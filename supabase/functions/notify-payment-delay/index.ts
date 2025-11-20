import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { renderTemplate } from '../_shared/template-utils.ts';

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

    // وضع الاختبار: إرسال رسالة اختبار مباشرة لتأخير الدفعات
    try {
      const body = await req.json();
      if (body?.test === true) {
        const orderDate = new Date().toLocaleDateString('ar-SA');
        const oldestOrder = `TEST-PAY-${new Date().toISOString().slice(0,10).replaceAll('-', '')}`;
        
        const msg = await renderTemplate(supabase, 'payment_delay_notification', {
          customer_name: 'اختبار',
          customer_phone: settings.whatsapp_number,
          outstanding_balance: '100.00',
          oldest_order: oldestOrder,
          order_date: orderDate,
          delay_days: settings.payment_delay_days.toString()
        }) || `🧪 *هذه رسالة اختبار*\n\n💰 *تنبيه: تأخير في الدفعات*\n\n👤 اسم العميل: اختبار\n📱 رقم الواتساب: ${settings.whatsapp_number}\n\n💵 الرصيد المستحق: 100.00 ريال\n📦 أقدم طلب: ${oldestOrder}\n📅 تاريخ الطلب: ${orderDate}\n⏱️ مر على الطلب: ${settings.payment_delay_days}+ أيام\n\nيرجى المتابعة مع العميل لتحصيل المستحقات.`;
        
        const { data: inserted, error: insertErr } = await supabase.from('whatsapp_messages').insert({
          from_number: 'system',
          to_number: settings.whatsapp_number,
          message_type: 'payment_delay_notification',
          message_content: msg,
          status: 'pending',
          dedupe_key: `payment_delay_test_${new Date().toISOString()}_${Math.random().toString(36).slice(2,8)}`
        }).select('id').single();
        if (insertErr) { console.error('Failed to insert test payment delay:', insertErr); }
        // استدعاء معالج الطابور فقط بدل الإرسال المباشر
        try {
          await supabase.functions.invoke('process-whatsapp-queue', { body: { trigger: 'notify-payment-delay' } });
        } catch (e) {
          console.warn('process-whatsapp-queue invoke failed (ignored):', e?.message || e);
        }

        return new Response(JSON.stringify({ success: true, message: 'Test payment delay notification sent' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }
    } catch {}

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

      const message = await renderTemplate(supabase, 'payment_delay_notification', {
        customer_name: customer.customer_name || 'غير معروف',
        customer_phone: customer.whatsapp || customer.phone || 'غير متوفر',
        outstanding_balance: customer.outstanding_balance?.toFixed(2) || '0.00',
        oldest_order: oldestOrder.order_number || 'غير محدد',
        order_date: orderDate,
        delay_days: settings.payment_delay_days.toString()
      }) || `💰 *تنبيه: تأخير في الدفعات*\n\n👤 اسم العميل: ${customer.customer_name}\n📱 رقم الواتساب: ${customer.whatsapp || 'غير متوفر'}\n📞 رقم الهاتف: ${customer.phone || 'غير متوفر'}\n\n💵 الرصيد المستحق: ${customer.outstanding_balance?.toFixed(2)} ريال\n📦 أقدم طلب: ${oldestOrder.order_number}\n📅 تاريخ الطلب: ${orderDate}\n⏱️ مر على الطلب: ${settings.payment_delay_days}+ أيام\n\nيرجى المتابعة مع العميل لتحصيل المستحقات.`;

      // اختيار رقم العميل (واتساب أو هاتف) بصيغة E.164
      const rawPhone = (customer.whatsapp || customer.phone || '').toString().trim();
      if (!rawPhone) {
        console.warn(`No phone/whatsapp for customer ${customer.customer_id}, skipping`);
        continue;
      }
      const raw = rawPhone.replace(/\s+/g, '');
      const digitsOnly = raw.replace(/[^\d]/g, '');
      const toE164 = raw.startsWith('+') ? raw.replace(/[^\d+]/g, '') : `+${digitsOnly}`;

      let msgId: string | null = null;
      const { data: msgInserted, error: msgInsertError } = await supabase
        .from('whatsapp_messages')
        .insert({
          from_number: 'system',
          to_number: toE164,
          message_type: 'payment_delay_notification',
          message_content: message,
          status: 'pending',
          dedupe_key: dedupeKey
        })
        .select('id')
        .single();

      if (msgInsertError) {
        // معالجة التكرار كحالة نجاح مع إعادة الإرسال
        // @ts-ignore - Supabase error structure
        if (msgInsertError.code === '23505') {
          const { data: existing } = await supabase
            .from('whatsapp_messages')
            .select('id')
            .eq('dedupe_key', dedupeKey)
            .single();
          msgId = existing?.id || null;
        } else {
          console.error('Failed to insert payment delay notification:', msgInsertError);
          continue;
        }
      } else {
        msgId = msgInserted?.id || null;
      }

      if (msgInsertError) {
        console.error('Failed to insert payment delay notification:', msgInsertError);
        continue;
      }

      try {
        await supabase.functions.invoke('process-whatsapp-queue', {
          body: { trigger: 'notify-payment-delay' }
        });
      } catch (e) {
        console.warn('process-whatsapp-queue invoke failed (ignored):', e?.message || e);
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
