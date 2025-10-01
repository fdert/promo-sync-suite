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

    console.log('Generating daily financial report...');

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

    if (!settings.daily_financial_report || !settings.whatsapp_number) {
      console.log('Daily financial report is disabled or no WhatsApp number configured');
      return new Response(
        JSON.stringify({ message: 'Report disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // تحديد تاريخ اليوم
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

    // جلب المدفوعات اليومية
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .gte('payment_date', todayStart)
      .lte('payment_date', todayEnd);

    const totalPayments = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    // جلب المصروفات اليومية
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('amount')
      .gte('expense_date', todayStart)
      .lte('expense_date', todayEnd);

    const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

    // حساب صافي الربح
    const netProfit = totalPayments - totalExpenses;

    // جلب عدد الطلبات الجديدة اليوم
    const { count: newOrdersCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd);

    // جلب عدد الطلبات المكتملة اليوم
    const { count: completedOrdersCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('updated_at', todayStart)
      .lte('updated_at', todayEnd);
    // استخدام رقم الواتساب كما هو (مع الاحتفاظ بعلامة + إن وجدت)
    const toNumber = String(settings.whatsapp_number || '').trim();

    const message = `📊 *التقرير المالي اليومي*

📅 التاريخ: ${today.toLocaleDateString('ar-SA')}

💰 *المبالغ المدفوعة اليوم:*
${totalPayments.toFixed(2)} ريال

💸 *المصروفات اليومية:*
${totalExpenses.toFixed(2)} ريال

📈 *صافي الربح اليومي:*
${netProfit.toFixed(2)} ريال ${netProfit >= 0 ? '✅' : '❌'}

📦 *الطلبات:*
• طلبات جديدة: ${newOrdersCount || 0}
• طلبات مكتملة: ${completedOrdersCount || 0}

---
تم إنشاء التقرير تلقائياً في تمام الساعة ${today.toLocaleTimeString('ar-SA')}`;

    // حفظ التقرير
    const { error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: toNumber,
        message_type: 'text',
        message_content: message,
        status: 'pending',
        dedupe_key: `daily_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });

    if (insertError) {
      console.error('Failed to insert daily report:', insertError);
      throw insertError;
    }

    console.log('Daily financial report created successfully');

    // إرسال مباشر عبر follow_up_webhook_url إذا كان موجوداً
    if (settings.follow_up_webhook_url) {
      try {
        console.log('Sending via follow_up_webhook:', settings.follow_up_webhook_url);
        
        const payload = {
          event: 'whatsapp_message_send',
          data: {
            to: toNumber,
            phone: toNumber,
            phoneNumber: toNumber,
            message: message,
            messageText: message,
            text: message,
            type: 'text',
            message_type: 'daily_financial_report',
            timestamp: Math.floor(Date.now() / 1000),
            from_number: 'system'
          }
        };

        const webhookResp = await fetch(settings.follow_up_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (webhookResp.ok) {
          console.log('✅ Sent via follow_up_webhook successfully');
          
          // تحديث الحالة إلى sent
          await supabase
            .from('whatsapp_messages')
            .update({ 
              status: 'sent', 
              sent_at: new Date().toISOString() 
            })
            .eq('to_number', toNumber)
            .eq('message_type', 'text')
            .order('created_at', { ascending: false })
            .limit(1);
        } else {
          console.warn('Follow_up_webhook failed, keeping pending');
        }
      } catch (webhookError) {
        console.error('Error sending via follow_up_webhook:', webhookError);
      }
    } else {
      // الطريقة العادية: استدعاء process-whatsapp-queue
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Invoking process-whatsapp-queue to send the message...');
      try {
        const { data: queueResult, error: queueError } = await supabase.functions.invoke('process-whatsapp-queue', {
          body: {
            action: 'process_pending_messages',
            timestamp: new Date().toISOString()
          }
        });

        if (queueError) {
          console.error('Error invoking process-whatsapp-queue:', queueError);
        } else {
          console.log('process-whatsapp-queue invoked successfully:', queueResult);
        }
      } catch (queueInvokeError) {
        console.error('Failed to invoke process-whatsapp-queue:', queueInvokeError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Daily report sent',
        data: {
          totalPayments,
          totalExpenses,
          netProfit,
          newOrdersCount,
          completedOrdersCount
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in daily-financial-report function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
