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

    const { payment_id, test } = await req.json();

    console.log('Processing new payment notification:', { payment_id, test });

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

    const getPaymentTypeArabic = (type: string) => {
      const types: Record<string, string> = {
        'cash': '💵 نقدي',
        'card': '💳 شبكة',
        'bank_transfer': '🏦 تحويل بنكي'
      };
      return types[type] || type;
    };

    let orderNumber, customerName, customerWhatsapp, totalAmount, paidAmount, remainingAmount, paymentDate, payment;
    
    // في حالة الاختبار، إنشاء بيانات وهمية
    if (test) {
      console.log('Test mode: Creating dummy payment data');
      const now = new Date();
      payment = {
        id: 'test-payment-id',
        amount: 750.00,
        payment_type: 'cash',
        payment_date: now.toISOString(),
        reference_number: 'REF-TEST-001',
        notes: 'دفعة تجريبية لاختبار النظام'
      };
      orderNumber = 'ORD-TEST-12345';
      customerName = 'عميل تجريبي';
      customerWhatsapp = '+966501234567';
      totalAmount = 1500;
      paidAmount = 1250;
      remainingAmount = 250;
      paymentDate = now.toLocaleDateString('ar-SA');
    } else {
      if (!payment_id) {
        return new Response(
          JSON.stringify({ error: 'payment_id is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      // جلب تفاصيل الدفعة الحقيقية
      const { data: fetchedPayment, error: paymentError } = await supabase
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

      if (paymentError || !fetchedPayment) {
        console.error('Failed to fetch payment details:', paymentError);
        return new Response(
          JSON.stringify({ error: 'Payment not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }
      
      payment = fetchedPayment;
      orderNumber = payment.orders?.order_number || 'غير محدد';
      customerName = payment.orders?.customers?.name || 'غير محدد';
      customerWhatsapp = payment.orders?.customers?.whatsapp || 'غير متوفر';
      totalAmount = payment.orders?.total_amount || 0;
      paidAmount = payment.orders?.paid_amount || 0;
      remainingAmount = totalAmount - paidAmount;
      paymentDate = new Date(payment.payment_date).toLocaleDateString('ar-SA');
    }

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

⏰ ${new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}

${test ? '\n🧪 *هذه رسالة اختبار*' : ''}`;

    const { data: msgInserted, error: msgInsertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: settings.whatsapp_number,
        message_type: 'payment_notification',
        message_content: message,
        status: 'pending',
        dedupe_key: `payment_logged_${test ? 'test' : payment_id}_${Date.now()}`
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