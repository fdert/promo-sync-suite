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

    const { payment_id } = await req.json();
    
    if (!payment_id) {
      return new Response(
        JSON.stringify({ error: 'payment_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Processing new payment notification:', payment_id);

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

    if (!settings.notify_payment_logged || !settings.whatsapp_number) {
      console.log('Payment notification is disabled or no WhatsApp number configured');
      return new Response(
        JSON.stringify({ message: 'Notification disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // جلب تفاصيل الدفعة
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        orders (
          order_number,
          total_amount,
          paid_amount,
          customers (name, whatsapp)
        )
      `)
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      console.error('Failed to fetch payment details:', paymentError);
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const getPaymentTypeArabic = (type: string) => {
      const types: Record<string, string> = {
        'cash': '💵 نقدي',
        'card': '💳 شبكة',
        'bank_transfer': '🏦 تحويل بنكي'
      };
      return types[type] || type;
    };

    const orderNumber = payment.orders?.order_number || 'غير محدد';
    const customerName = payment.orders?.customers?.name || 'غير محدد';
    const customerWhatsapp = payment.orders?.customers?.whatsapp || 'غير متوفر';
    const totalAmount = payment.orders?.total_amount || 0;
    const paidAmount = payment.orders?.paid_amount || 0;
    const remainingAmount = totalAmount - paidAmount;
    const paymentDate = new Date(payment.payment_date).toLocaleDateString('ar-SA');

    const message = `💰 *إشعار: تسجيل دفعة جديدة*

📦 رقم الطلب: ${orderNumber}
👤 العميل: ${customerName}
📱 واتساب العميل: ${customerWhatsapp}

━━━━━━━━━━━━━━━━━━━━

💵 تفاصيل الدفعة:
• المبلغ المدفوع: ${payment.amount.toFixed(2)} ر.س
• طريقة الدفع: ${getPaymentTypeArabic(payment.payment_type)}
• تاريخ الدفع: ${paymentDate}
${payment.reference_number ? `• رقم المرجع: ${payment.reference_number}` : ''}
${payment.notes ? `• ملاحظات: ${payment.notes}` : ''}

━━━━━━━━━━━━━━━━━━━━

📊 حالة الطلب:
• إجمالي الطلب: ${totalAmount.toFixed(2)} ر.س
• المبلغ المدفوع: ${paidAmount.toFixed(2)} ر.س
• المتبقي: ${remainingAmount.toFixed(2)} ر.س
• الحالة: ${remainingAmount <= 0 ? '✅ مدفوع بالكامل' : '⏳ دفعة جزئية'}

⏰ ${new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`;

    const { data: msgInserted, error: msgInsertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: settings.whatsapp_number,
        message_type: 'payment_notification',
        message_content: message,
        status: 'pending',
        dedupe_key: `payment_logged_${payment_id}`
      })
      .select('id')
      .single();

    if (msgInsertError) {
      console.error('Failed to insert payment notification:', msgInsertError);
      throw msgInsertError;
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
            message_type: 'payment_notification',
            timestamp: Math.floor(Date.now() / 1000),
            from_number: 'system',
            payment_id: payment_id
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
          
          console.log('✅ Payment notification sent successfully');
        }
      } catch (webhookError) {
        console.error('Error sending via follow_up_webhook:', webhookError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payment notification created' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in notify-new-payment function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});