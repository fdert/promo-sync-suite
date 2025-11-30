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

    // حساب التواريخ
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const twoDaysLater = new Date(today);
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);

    // جلب الأقساط المستحقة خلال يومين
    const { data: upcomingInstallments, error: fetchError } = await supabase
      .from('installment_payments')
      .select(`
        *,
        installment_plans!inner(
          id,
          orders!inner(
            order_number,
            customers!inner(
              name,
              phone,
              whatsapp
            )
          )
        )
      `)
      .eq('status', 'pending')
      .gte('due_date', today.toISOString().split('T')[0])
      .lte('due_date', twoDaysLater.toISOString().split('T')[0]);

    if (fetchError) {
      throw fetchError;
    }

    // جلب قالب التذكير
    const { data: template } = await supabase
      .from('message_templates')
      .select('content')
      .eq('name', 'installment_reminder')
      .eq('is_active', true)
      .single();

    const templateContent = template?.content || 
      `🔔 تذكير بموعد دفع القسط\n\n` +
      `📋 رقم الطلب: {{order_number}}\n` +
      `💰 المبلغ المطلوب: {{amount}}\n` +
      `📅 موعد الاستحقاق: {{due_date}}\n` +
      `📝 رقم القسط: {{installment_number}}\n\n` +
      `يرجى السداد في الموعد المحدد. شكراً لك! 🙏`;

    let remindersCount = 0;

    // معالجة كل قسط
    for (const installment of upcomingInstallments || []) {
      const dueDate = new Date(installment.due_date);
      const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // التحقق من نوع التذكير المطلوب
      let shouldSendReminder = false;
      if (daysDiff === 2 && !installment.reminder_sent_2days) {
        shouldSendReminder = true;
      } else if (daysDiff === 1 && !installment.reminder_sent_1day) {
        shouldSendReminder = true;
      }

      if (!shouldSendReminder) continue;

      const customer = installment.installment_plans.orders.customers;
      const orderNumber = installment.installment_plans.orders.order_number;
      const customerPhone = customer.whatsapp || customer.phone;

      if (!customerPhone) continue;

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

      // تجهيز رسالة التذكير بالقالب
      const message = templateContent
        .replace(/\{\{order_number\}\}/g, orderNumber)
        .replace(/\{\{amount\}\}/g, formattedAmount)
        .replace(/\{\{due_date\}\}/g, formattedDate)
        .replace(/\{\{installment_number\}\}/g, installment.installment_number.toString());

      // إدراج رسالة واتساب
      const { error: messageError } = await supabase
        .from('whatsapp_messages')
        .insert({
          to_number: customerPhone,
          message_content: message,
          message_type: 'installment_reminder',
          customer_id: customer.id,
          status: 'pending',
        });

      if (messageError) {
        console.error('Error inserting WhatsApp message:', messageError);
        continue;
      }

      // تحديث حالة التذكير
      const updateData: any = {};
      if (daysDiff === 2) {
        updateData.reminder_sent_2days = true;
      } else if (daysDiff === 1) {
        updateData.reminder_sent_1day = true;
      }

      const { error: updateError } = await supabase
        .from('installment_payments')
        .update(updateData)
        .eq('id', installment.id);

      if (updateError) {
        console.error('Error updating installment:', updateError);
        continue;
      }

      remindersCount++;
    }

    // تشغيل معالج الرسائل إذا كان هناك رسائل
    if (remindersCount > 0) {
      await supabase.functions.invoke('process-whatsapp-queue', {
        body: { source: 'installment-reminders' }
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        reminders_sent: remindersCount,
        message: `تم إرسال ${remindersCount} تذكير بنجاح`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-installment-reminders:', error);
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