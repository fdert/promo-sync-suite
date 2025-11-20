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

    console.log('Checking for delayed orders...');

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

    if (!settings.notify_delivery_delay || !settings.whatsapp_number) {
      console.log('Delivery delay notification is disabled or no WhatsApp number configured');
      return new Response(
        JSON.stringify({ message: 'Notification disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // وضع الاختبار: إرسال رسالة اختبار مباشرة
    let isTest = false;
    try {
      const body = await req.json();
      isTest = !!body?.test;
    } catch {}

    if (isTest) {
      const customerName = 'اختبار';
      const deliveryDateStr = new Date().toLocaleDateString('ar-SA');
      const orderNumber = `TEST-DEL-${new Date().toISOString().slice(0,10).replaceAll('-', '')}`;
      
      const message = await renderTemplate(supabase, 'delivery_delay_notification', {
        customer_name: customerName,
        order_number: orderNumber,
        delivery_date: deliveryDateStr,
        delay_days: settings.delivery_delay_days.toString()
      }) || `🧪 *هذه رسالة اختبار*\n\n⚠️ *تنبيه: تجاوز فترة التسليم*\n\n📦 رقم الطلب: ${orderNumber}\n👤 اسم العميل: ${customerName}\n📅 تاريخ التسليم المتوقع: ${deliveryDateStr}\n⏱️ تأخير: ${settings.delivery_delay_days}+ أيام\n\nيرجى المتابعة الفورية مع العميل.`;
      
      const { data: msgInserted, error: msgInsertError } = await supabase
        .from('whatsapp_messages')
        .insert({
          from_number: 'system',
          to_number: settings.whatsapp_number,
          message_type: 'delivery_delay_notification',
          message_content: message,
          status: 'pending',
          dedupe_key: `delivery_delay_test_${new Date().toISOString()}_${Math.random().toString(36).slice(2,8)}`
        })
        .select('id')
        .single();
      if (msgInsertError) {
        console.error('Failed to insert delivery delay test notification:', msgInsertError);
      }
      // استدعاء معالج الطابور فقط بدل الإرسال المباشر
      try {
        await supabase.functions.invoke('process-whatsapp-queue', { body: { trigger: 'notify-delivery-delay' } });
      } catch (e) {
        console.warn('process-whatsapp-queue invoke failed (ignored):', e?.message || e);
      }

      return new Response(JSON.stringify({ success: true, message: 'Test delivery delay notification sent' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // البحث عن الطلبات المتأخرة
    const delayDate = new Date();
    delayDate.setDate(delayDate.getDate() - settings.delivery_delay_days);

    const { data: delayedOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, delivery_date, customers(name, phone, whatsapp)')
      .eq('status', 'in_progress')
      .lt('delivery_date', delayDate.toISOString())
      .order('delivery_date', { ascending: true })
      .limit(10);

    if (ordersError) {
      console.error('Failed to fetch delayed orders:', ordersError);
      throw ordersError;
    }

    if (!delayedOrders || delayedOrders.length === 0) {
      console.log('No delayed orders found');
      return new Response(
        JSON.stringify({ message: 'No delayed orders' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${delayedOrders.length} delayed orders`);

    // إرسال إشعار لكل طلب متأخر
    for (const order of delayedOrders) {
      const customerName = order.customers?.name || 'غير معروف';
      const deliveryDate = new Date(order.delivery_date).toLocaleDateString('ar-SA');

      const message = await renderTemplate(supabase, 'delivery_delay_notification', {
        customer_name: customerName,
        order_number: order.order_number || 'غير محدد',
        delivery_date: deliveryDate,
        delay_days: settings.delivery_delay_days.toString()
      }) || `⚠️ *تنبيه: تجاوز فترة التسليم*\n\n📦 رقم الطلب: ${order.order_number}\n👤 اسم العميل: ${customerName}\n📅 تاريخ التسليم المتوقع: ${deliveryDate}\n⏱️ تأخير: ${settings.delivery_delay_days}+ أيام\n\nيرجى المتابعة الفورية مع العميل.`;

      // اختيار رقم العميل من بيانات الطلب (واتساب ثم الهاتف)
      const rawPhone = (order.customers?.whatsapp || order.customers?.phone || '').toString().trim();
      if (!rawPhone) {
        console.warn(`No phone/whatsapp for order ${order.id}, skipping`);
        continue;
      }
      const raw = rawPhone.replace(/\s+/g, '');
      const digitsOnly = raw.replace(/[^\d]/g, '');
      const toE164 = raw.startsWith('+') ? raw.replace(/[^\d+]/g, '') : `+${digitsOnly}`;

      const { data: msgInserted, error: msgInsertError } = await supabase
        .from('whatsapp_messages')
        .insert({
          from_number: 'system',
          to_number: toE164,
          message_type: 'delivery_delay_notification',
          message_content: message,
          status: 'pending',
          dedupe_key: `delivery_delay_${order.id}_${new Date().toISOString().split('T')[0]}`
        })
        .select('id')
        .single();

      if (msgInsertError) {
        console.error('Failed to insert delivery delay notification:', msgInsertError);
        continue;
      }

      // استدعاء معالج الطابور فقط بدل الإرسال المباشر
      try {
        await supabase.functions.invoke('process-whatsapp-queue', {
          body: { trigger: 'notify-delivery-delay' }
        });
      } catch (e) {
        console.warn('process-whatsapp-queue invoke failed (ignored):', e?.message || e);
      }

    }

    console.log('Delivery delay notifications created successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${delayedOrders.length} notifications`,
        count: delayedOrders.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in notify-delivery-delay function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
