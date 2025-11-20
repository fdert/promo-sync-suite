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

    const message = await renderTemplate(supabase, 'new_payment_notification', {
      amount: payment.amount.toFixed(2),
      order_number: orderNumber,
      customer_name: customerName,
      payment_type: getPaymentTypeArabic(payment.payment_type),
      total_amount: totalAmount.toFixed(2),
      paid_amount: paidAmount.toFixed(2),
      remaining_amount: remainingAmount.toFixed(2),
      timestamp: new Date().toLocaleString('ar-SA')
    }) || `💰 *إشعار: تسجيل دفعة جديدة*\n\n📦 رقم الطلب: ${orderNumber}\n👤 العميل: ${customerName}\n📱 واتساب العميل: ${customerWhatsapp}\n\n━━━━━━━━━━━━━━━━━━━━\n\n💵 تفاصيل الدفعة:\n• المبلغ المدفوع: ${payment.amount.toFixed(2)} ر.س\n• طريقة الدفع: ${getPaymentTypeArabic(payment.payment_type)}\n• تاريخ الدفع: ${paymentDate}\n${payment.reference_number ? `• رقم المرجع: ${payment.reference_number}` : ''}\n${payment.notes ? `• ملاحظات: ${payment.notes}` : ''}\n\n━━━━━━━━━━━━━━━━━━━━\n\n📊 حالة الطلب:\n• إجمالي الطلب: ${totalAmount.toFixed(2)} ر.س\n• المبلغ المدفوع: ${paidAmount.toFixed(2)} ر.س\n• المتبقي: ${remainingAmount.toFixed(2)} ر.س\n• الحالة: ${remainingAmount <= 0 ? '✅ مدفوع بالكامل' : '⏳ دفعة جزئية'}\n\n⏰ ${new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}\n\n${test ? '\n🧪 *هذه رسالة اختبار*' : ''}`;

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

    // استبدال الإرسال المباشر: استدعاء معالج الطابور فقط
    try {
      await supabase.functions.invoke('process-whatsapp-queue', {
        body: { trigger: 'notify-new-payment', message_id: msgInserted?.id }
      });
      console.log('Triggered process-whatsapp-queue for new payment');
    } catch (e) {
      console.warn('process-whatsapp-queue invoke failed (ignored):', e?.message || e);
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