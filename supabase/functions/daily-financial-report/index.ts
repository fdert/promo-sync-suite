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

    // قراءة وضع الاختبار من جسم الطلب إن وُجد
    let isTest = false;
    try {
      const body = await req.json();
      isTest = !!body?.test;
    } catch {}

    console.log('Generating daily financial report...', { isTest });

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

    if ((!settings.daily_financial_report || !settings.whatsapp_number) && !isTest) {
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
    const todayDateStr = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().slice(0, 10);

    // جلب المدفوعات اليومية مع تفاصيل الطلب
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        amount,
        payment_type,
        order_id,
        orders (
          order_number,
          total_amount,
          paid_amount,
          customer_id,
          customers (name)
        )
      `)
      .gte('payment_date', todayStart)
      .lte('payment_date', todayEnd)
      .order('created_at', { ascending: true });

    const totalPayments = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    // جلب المصروفات اليومية مع التفاصيل
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('amount, expense_type, description')
      .gte('expense_date', todayStart)
      .lte('expense_date', todayEnd)
      .order('created_at', { ascending: true });

    const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

    // حساب صافي الربح
    const netProfit = totalPayments - totalExpenses;

    // جلب الطلبات الجديدة اليوم مع التفاصيل
    const { data: newOrders } = await supabase
      .from('orders')
      .select(`
        order_number,
        total_amount,
        customers (name)
      `)
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)
      .order('created_at', { ascending: true });

    // جلب الطلبات المتأخرة (موعدها اليوم ولم تسلم)
    const { data: delayedOrders } = await supabase
      .from('orders')
      .select(`
        order_number,
        delivery_date,
        customers (name)
      `)
      .eq('delivery_date', todayDateStr)
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .order('delivery_date', { ascending: true });

    // جلب عدد الطلبات المكتملة اليوم
    const { count: completedOrdersCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('updated_at', todayStart)
      .lte('updated_at', todayEnd);

    // جلب تفاصيل الطلبات المكتملة اليوم
    const { data: completedOrdersToday } = await supabase
      .from('orders')
      .select(`
        order_number,
        total_amount,
        customers (name)
      `)
      .eq('status', 'completed')
      .gte('updated_at', todayStart)
      .lte('updated_at', todayEnd)
      .order('updated_at', { ascending: true });
    // استخدام رقم الواتساب كما هو (مع الاحتفاظ بعلامة + إن وجدت)
    const toNumber = String(settings.whatsapp_number || '').trim();

    // دالة لتحويل نوع الدفع إلى عربي
    const getPaymentTypeArabic = (type: string) => {
      const types: Record<string, string> = {
        'cash': '💵 نقدي',
        'card': '💳 شبكة',
        'bank_transfer': '🏦 تحويل بنكي'
      };
      return types[type] || type;
    };

    // دالة لحساب الأيام المتأخرة
    const getDaysDelayed = (deliveryDate: string) => {
      const delivery = new Date(deliveryDate);
      const diff = Math.floor((today.getTime() - delivery.getTime()) / (1000 * 60 * 60 * 24));
      return diff;
    };

    // بناء قسم المدفوعات (مبسط)
    let paymentsSection = '';
    if (payments && payments.length > 0) {
      paymentsSection = '\n💰 *تفاصيل المدفوعات:*\n';
      payments.forEach((payment: any, index: number) => {
        const orderNumber = payment.orders?.order_number || 'غير محدد';
        const customerName = payment.orders?.customers?.name || 'غير محدد';
        
        paymentsSection += `${index + 1}. ${orderNumber} - ${customerName}\n`;
        paymentsSection += `   ${getPaymentTypeArabic(payment.payment_type)}: ${payment.amount.toFixed(2)} ر.س\n`;
      });
    }

    // بناء قسم المصروفات
    let expensesSection = '';
    if (expenses && expenses.length > 0) {
      expensesSection = '\n💸 *تفاصيل المصروفات:*\n';
      expenses.forEach((expense: any, index: number) => {
        const description = expense.description || expense.expense_type || 'مصروف';
        expensesSection += `${index + 1}. ${description}: ${expense.amount.toFixed(2)} ر.س\n`;
      });
    }

    // بناء قسم الطلبات الجديدة (مبسط)
    let newOrdersSection = '';
    if (newOrders && newOrders.length > 0) {
      newOrdersSection = '\n📦 *الطلبات الجديدة:*\n';
      newOrders.forEach((order: any, index: number) => {
        const customerName = order.customers?.name || 'غير محدد';
        newOrdersSection += `${index + 1}. ${order.order_number} - ${customerName}: ${order.total_amount.toFixed(2)} ر.س\n`;
      });
    }

    // بناء قسم الطلبات المكتملة (مبسط)
    let completedSection = '';
    if (completedOrdersToday && completedOrdersToday.length > 0) {
      completedSection = '\n✅ *الطلبات المكتملة:*\n';
      completedOrdersToday.forEach((order: any, index: number) => {
        const customerName = order.customers?.name || 'غير محدد';
        completedSection += `${index + 1}. ${order.order_number} - ${customerName}: ${Number(order.total_amount || 0).toFixed(2)} ر.س\n`;
      });
    }

    // بناء قسم الطلبات الجاهزة للتسليم (مبسط)
    let delayedSection = '';
    if (delayedOrders && delayedOrders.length > 0) {
      delayedSection = '\n📅 *جاهزة للتسليم اليوم:*\n';
      delayedOrders.forEach((order: any, index: number) => {
        const customerName = order.customers?.name || 'غير محدد';
        delayedSection += `${index + 1}. ${order.order_number} - ${customerName}\n`;
      });
    }

    const message = `📊 *التقرير المالي اليومي*
📅 ${today.toLocaleDateString('ar-SA')}

━━━━━━━━━━━━━━━━━━━━

📈 *الملخص المالي:*
💰 المدفوعات: ${totalPayments.toFixed(2)} ر.س
💸 المصروفات: ${totalExpenses.toFixed(2)} ر.س
📊 صافي الربح: ${netProfit.toFixed(2)} ر.س ${netProfit >= 0 ? '✅' : '❌'}

━━━━━━━━━━━━━━━━━━━━

📦 *إحصائيات:*
• جديدة: ${newOrders?.length || 0} | مكتملة: ${completedOrdersCount || 0} | للتسليم: ${delayedOrders?.length || 0}
${paymentsSection}${paymentsSection ? '━━━━━━━━━━━━━━━━━━━━\n' : ''}${expensesSection}${expensesSection ? '━━━━━━━━━━━━━━━━━━━━\n' : ''}${newOrdersSection}${newOrdersSection ? '━━━━━━━━━━━━━━━━━━━━\n' : ''}${completedSection}${completedSection ? '━━━━━━━━━━━━━━━━━━━━\n' : ''}${delayedSection}${delayedSection ? '━━━━━━━━━━━━━━━━━━━━\n' : ''}
⏰ ${today.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`;

    const finalMessage = isTest ? `🧪 *هذه رسالة اختبار*\n\n${message}` : message;

    // تقسيم الرسالة إلى أجزاء قصيرة مناسبة للواتساب
    const splitMessage = (text: string, max = 1000) => {
      const parts: string[] = [];
      const separators = ['\n━━━━━━━━━━━━━━━━━━━━\n', '\n\n', '\n', ' '];
      let remaining = text;
      while (remaining.length > max) {
        let cut = -1;
        for (const sep of separators) {
          const idx = remaining.lastIndexOf(sep, max - 40);
          if (idx > 0) { cut = idx + sep.length; break; }
        }
        if (cut <= 0) cut = Math.min(max - 40, remaining.length);
        parts.push(remaining.slice(0, cut).trim());
        remaining = remaining.slice(cut);
      }
      if (remaining.trim().length) parts.push(remaining.trim());
      return parts;
    };

    const chunks = splitMessage(finalMessage, 1000);
    console.log(`Daily report will be sent in ${chunks.length} part(s).`);

    const sentIds: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const suffix = `\n\n— الجزء ${i + 1}/${chunks.length}`;
      let content = chunks[i];
      // تأكد أن اللاحقة لا تتجاوز الحد
      if (content.length + suffix.length > 1500) {
        content = content.slice(0, 1500 - suffix.length - 3) + '...';
      }
      const partMessage = `${content}${chunks.length > 1 ? suffix : ''}`;

      // حفظ كل جزء كرسالة مستقلة
      const { data: insertedPart, error: insertErrorPart } = await supabase
        .from('whatsapp_messages')
        .insert({
          from_number: 'system',
          to_number: toNumber,
          message_type: 'text',
          message_content: partMessage,
          status: 'pending',
          dedupe_key: `${isTest ? 'daily_report_test' : 'daily_report'}_${new Date().toISOString()}_part_${i + 1}`
        })
        .select('id')
        .single();

      if (insertErrorPart) {
        console.error('Failed to insert daily report part:', insertErrorPart);
        throw insertErrorPart;
      }

      const partId = insertedPart?.id as string | undefined;

      // إرسال عبر follow_up_webhook_url إن وُجد
      if (settings.follow_up_webhook_url) {
        try {
          console.log('Sending via follow_up_webhook:', settings.follow_up_webhook_url, `part ${i + 1}/${chunks.length}`);
          const payload = {
            event: 'whatsapp_message_send',
            data: {
              to: toNumber,
              to_e164: toNumber,
              to_digits: toNumber.replace(/[^\d]/g, ''),
              phone: toNumber.replace(/[^\d]/g, ''),
              phoneNumber: toNumber.replace(/[^\d]/g, ''),
              phone_e164: toNumber,
              phone_digits: toNumber.replace(/[^\d]/g, ''),
              msisdn: toNumber.replace(/[^\d]/g, ''),
              message: partMessage,
              messageText: partMessage,
              text: partMessage,
              type: 'text',
              message_type: 'text',
              timestamp: Math.floor(Date.now() / 1000),
              from_number: 'system',
              order_id: null,
              order_number: `REPORT-${new Date().toISOString().slice(0,10).replaceAll('-', '')}`,
              customer_name: 'إدارة المتابعة',
              notification_type: 'financial_report'
            }
          };

          const webhookResp = await fetch(settings.follow_up_webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const respText = await webhookResp.text();
          if (webhookResp.ok) {
            console.log('✅ Sent via follow_up_webhook successfully', { part: i + 1, total: chunks.length, resp: respText?.slice(0, 120) });
            if (partId) {
              await supabase
                .from('whatsapp_messages')
                .update({ status: 'sent', sent_at: new Date().toISOString() })
                .eq('id', partId);
            }
            sentIds.push(partId || '');
          } else {
            console.warn('Follow_up_webhook failed for part', i + 1, 'status:', webhookResp.status);
          }
        } catch (webhookError) {
          console.error('Error sending via follow_up_webhook (part):', webhookError);
        }
      }

      // في وضع الاختبار: إرسال كل جزء مباشرة عبر الدالة المحسّنة
      if (isTest) {
        try {
          const directPhone = toNumber.replace(/[^\d]/g, '');
          const directResp: any = await supabase.functions.invoke('send-whatsapp-direct-improved', {
            body: { phone: directPhone, message: partMessage, customer_name: 'إدارة المتابعة' }
          });
          if (directResp?.error) {
            console.warn('Fallback direct send error (part):', directResp.error);
          } else {
            console.log('✅ Fallback direct send invoked successfully (part)', i + 1);
          }
        } catch (e) {
          console.warn('Failed to invoke send-whatsapp-direct-improved (part):', e);
        }
      }
    }

    // معالجة قائمة الرسائل عبر القناة القياسية دائماً لضمان الإرسال
    try {
      const { error: queueError2 } = await supabase.functions.invoke('process-whatsapp-queue', {
        body: { action: 'process_pending_messages', source: 'daily-financial-report' }
      }) as any;
      if (queueError2) {
        console.warn('Queue processing error:', queueError2);
      } else {
        console.log('Queued WhatsApp message for processing.');
      }
    } catch (e) {
      console.warn('Failed to invoke process-whatsapp-queue:', e);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Daily report sent or queued',
        data: {
          totalPayments,
          totalExpenses,
          netProfit,
          newOrdersCount: newOrders?.length || 0,
          completedOrdersCount,
          delayedOrdersCount: delayedOrders?.length || 0
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
