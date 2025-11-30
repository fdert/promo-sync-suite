import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // تحديث حالة الأقساط المتأخرة
    const today = new Date().toISOString().split('T')[0];
    
    const { data: overdueInstallments, error: updateError } = await supabase
      .from('installment_payments')
      .update({ status: 'overdue' })
      .eq('status', 'pending')
      .lt('due_date', today)
      .select(`
        *,
        installment_plans!inner(
          orders!inner(
            order_number,
            customers!inner(
              id,
              name,
              phone,
              whatsapp
            )
          )
        )
      `);

    if (updateError) {
      throw updateError;
    }

    // إرسال إشعارات للعملاء عن الأقساط المتأخرة
    let notificationsCount = 0;

    for (const installment of overdueInstallments || []) {
      const customer = installment.installment_plans.orders.customers;
      const orderNumber = installment.installment_plans.orders.order_number;
      const customerPhone = customer.whatsapp || customer.phone;

      if (!customerPhone) continue;

      // حساب عدد أيام التأخير
      const dueDate = new Date(installment.due_date);
      const daysPastDue = Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // تنسيق المبلغ
      const formattedAmount = new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: 'SAR',
        minimumFractionDigits: 0,
      }).format(installment.amount);

      // تنسيق التاريخ
      const formattedDate = new Intl.DateTimeFormat('ar-SA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(dueDate);

      // إنشاء رسالة التأخير
      const message = `❌ إشعار: قسط متأخر عن السداد\n\n` +
        `📋 رقم الطلب: ${orderNumber}\n` +
        `💰 المبلغ المطلوب: ${formattedAmount}\n` +
        `📅 موعد الاستحقاق: ${formattedDate}\n` +
        `⏰ متأخر بـ: ${daysPastDue} يوم\n\n` +
        `يرجى المبادرة بالسداد في أقرب وقت. نشكر تعاونكم! 🙏`;

      // إدراج رسالة واتساب
      const { error: messageError } = await supabase
        .from('whatsapp_messages')
        .insert({
          to_number: customerPhone,
          message_content: message,
          customer_id: customer.id,
          status: 'pending',
        });

      if (messageError) {
        console.error('Error inserting WhatsApp message:', messageError);
        continue;
      }

      notificationsCount++;
    }

    // تشغيل معالج الرسائل إذا كان هناك رسائل
    if (notificationsCount > 0) {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-whatsapp-queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({ source: 'overdue-installments' }),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        overdue_count: overdueInstallments?.length || 0,
        notifications_sent: notificationsCount,
        message: `تم تحديث ${overdueInstallments?.length || 0} قسط متأخر وإرسال ${notificationsCount} إشعار`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in mark-overdue-installments:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});