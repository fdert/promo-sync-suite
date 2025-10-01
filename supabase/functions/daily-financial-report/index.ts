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

    // جلب المصروفات اليومية
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('amount')
      .gte('expense_date', todayStart)
      .lte('expense_date', todayEnd);

    const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

    // حساب صافي الربح
    const netProfit = totalPayments - totalExpenses;

    // جلب الطلبات الجديدة اليوم مع التفاصيل
    const { data: newOrders } = await supabase
      .from('orders')
      .select(`
        order_number,
        total_amount,
        customers (name),
        order_items (item_name, quantity, unit_price)
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
      .lte('delivery_date', todayEnd)
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

    // بناء قسم المدفوعات
    let paymentsSection = '';
    if (payments && payments.length > 0) {
      paymentsSection = '\n💰 *تفاصيل المدفوعات اليومية:*\n';
      payments.forEach((payment: any, index: number) => {
        const orderNumber = payment.orders?.order_number || 'غير محدد';
        const customerName = payment.orders?.customers?.name || 'غير محدد';
        const totalAmount = payment.orders?.total_amount || 0;
        const paidAmount = payment.orders?.paid_amount || 0;
        const remainingAmount = totalAmount - paidAmount;
        
        paymentsSection += `\n${index + 1}. طلب: ${orderNumber}`;
        paymentsSection += `\n   ${getPaymentTypeArabic(payment.payment_type)} - ${payment.amount.toFixed(2)} ر.س`;
        paymentsSection += `\n   العميل: ${customerName}`;
        paymentsSection += `\n   الإجمالي: ${totalAmount.toFixed(2)} | المدفوع: ${paidAmount.toFixed(2)} | المتبقي: ${remainingAmount.toFixed(2)}`;
        paymentsSection += '\n';
      });
    }

    // بناء قسم الطلبات الجديدة
    let newOrdersSection = '';
    if (newOrders && newOrders.length > 0) {
      newOrdersSection = '\n📦 *الطلبات الجديدة اليوم:*\n';
      newOrders.forEach((order: any, index: number) => {
        const customerName = order.customers?.name || 'غير محدد';
        newOrdersSection += `\n${index + 1}. طلب: ${order.order_number}`;
        newOrdersSection += `\n   العميل: ${customerName}`;
        newOrdersSection += `\n   الإجمالي: ${order.total_amount.toFixed(2)} ر.س`;
        
        if (order.order_items && order.order_items.length > 0) {
          newOrdersSection += '\n   البنود:';
          order.order_items.forEach((item: any) => {
            newOrdersSection += `\n   • ${item.item_name} (${item.quantity} × ${item.unit_price.toFixed(2)})`;
          });
        }
        newOrdersSection += '\n';
      });
    }

    // بناء قسم الطلبات المتأخرة
    let delayedSection = '';
    if (delayedOrders && delayedOrders.length > 0) {
      delayedSection = '\n⚠️ *الطلبات المتأخرة (موعد التسليم اليوم):*\n';
      delayedOrders.forEach((order: any, index: number) => {
        const customerName = order.customers?.name || 'غير محدد';
        const daysDelayed = getDaysDelayed(order.delivery_date);
        const deliveryDateFormatted = new Date(order.delivery_date).toLocaleDateString('ar-SA');
        
        delayedSection += `\n${index + 1}. طلب: ${order.order_number}`;
        delayedSection += `\n   العميل: ${customerName}`;
        delayedSection += `\n   موعد التسليم: ${deliveryDateFormatted}`;
        delayedSection += `\n   التأخير: ${daysDelayed} يوم`;
        delayedSection += '\n';
      });
    }

    const message = `📊 *التقرير المالي اليومي*

📅 التاريخ: ${today.toLocaleDateString('ar-SA')}

━━━━━━━━━━━━━━━━━━━━

📈 *الملخص المالي:*
💰 إجمالي المدفوعات: ${totalPayments.toFixed(2)} ر.س
💸 إجمالي المصروفات: ${totalExpenses.toFixed(2)} ر.س
📊 صافي الربح: ${netProfit.toFixed(2)} ر.س ${netProfit >= 0 ? '✅' : '❌'}

━━━━━━━━━━━━━━━━━━━━

📦 *إحصائيات الطلبات:*
• طلبات جديدة: ${newOrders?.length || 0}
• طلبات مكتملة: ${completedOrdersCount || 0}
• طلبات متأخرة: ${delayedOrders?.length || 0}
${paymentsSection}
━━━━━━━━━━━━━━━━━━━━
${newOrdersSection}${newOrdersSection ? '━━━━━━━━━━━━━━━━━━━━' : ''}
${delayedSection}${delayedSection ? '━━━━━━━━━━━━━━━━━━━━' : ''}

⏰ تم إنشاء التقرير: ${today.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`;

    // حفظ التقرير
    const { data: inserted, error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: toNumber,
        message_type: 'text',
        message_content: message,
        status: 'pending',
        dedupe_key: `daily_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to insert daily report:', insertError);
      throw insertError;
    }

    const messageId = inserted?.id;

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
          
          if (messageId) {
            // تحديث الحالة إلى sent
            await supabase
              .from('whatsapp_messages')
              .update({ 
                status: 'sent', 
                sent_at: new Date().toISOString() 
              })
              .eq('id', messageId);
          }
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
