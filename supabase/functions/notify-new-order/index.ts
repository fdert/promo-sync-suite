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

    const { orderId } = await req.json();

    console.log('Processing new order notification:', { orderId });

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

    if (!settings.notify_new_order || !settings.whatsapp_number) {
      console.log('New order notification is disabled or no WhatsApp number configured');
      return new Response(
        JSON.stringify({ message: 'Notification disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // جلب تفاصيل الطلب الكاملة
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        customers (
          name,
          phone,
          whatsapp
        ),
        service_types (
          name
        ),
        order_items (
          item_name,
          quantity,
          unit_price,
          total,
          description
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Failed to fetch order details:', orderError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch order' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // تنسيق الحالة
    const statusMap: Record<string, string> = {
      'pending': 'قيد الانتظار',
      'in_progress': 'قيد التنفيذ',
      'completed': 'مكتمل',
      'cancelled': 'ملغي'
    };

    // تنسيق بنود الطلب
    let itemsText = '';
    if (order.order_items && order.order_items.length > 0) {
      itemsText = order.order_items.map((item: any, index: number) => 
        `${index + 1}. ${item.item_name}
   الكمية: ${item.quantity}
   السعر: ${item.unit_price} ريال
   الإجمالي: ${item.total} ريال${item.description ? `\n   الوصف: ${item.description}` : ''}`
      ).join('\n\n');
    }

    // إنشاء رسالة الإشعار المفصلة
    const message = `🎉 *طلب جديد*

📦 *رقم الطلب:* ${order.order_number}

👤 *معلومات العميل:*
• الاسم: ${order.customers?.name || 'غير محدد'}
• الجوال: ${order.customers?.phone || order.customers?.whatsapp || 'غير محدد'}

🔧 *تفاصيل الطلب:*
• الخدمة: ${order.service_types?.name || 'غير محدد'}
${order.notes ? `• الوصف: ${order.notes}` : ''}
• الحالة: ${statusMap[order.status] || order.status}
${order.delivery_date ? `• تاريخ الاستحقاق: ${new Date(order.delivery_date).toLocaleDateString('ar-SA')}` : ''}

💰 *المبالغ المالية:*
• المبلغ الإجمالي: ${order.total_amount} ريال
• المبلغ المدفوع: ${order.paid_amount || 0} ريال
• المبلغ المتبقي: ${(order.total_amount - (order.paid_amount || 0)).toFixed(2)} ريال

📋 *بنود الطلب:*
${itemsText || 'لا توجد بنود'}

⏰ تاريخ الإنشاء: ${new Date(order.created_at).toLocaleString('ar-SA')}

يرجى متابعة الطلب والتواصل مع العميل.`;

    // حفظ الرسالة في قاعدة البيانات
    const { data: inserted, error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: settings.whatsapp_number,
        message_type: 'new_order_notification',
        message_content: message,
        status: 'pending',
        dedupe_key: `new_order_${orderId}_${Date.now()}`
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to insert WhatsApp message:', insertError);
      throw insertError;
    }

    const messageId = inserted?.id;

    console.log('New order notification saved successfully');

    // إرسال مباشر عبر follow_up_webhook_url إذا كان موجوداً
    if (settings.follow_up_webhook_url) {
      try {
        console.log('Sending via follow_up_webhook:', settings.follow_up_webhook_url);
        
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
            message_type: 'new_order_notification',
            timestamp: Math.floor(Date.now() / 1000),
            from_number: 'system',
            order_id: orderId,
            order_number: order.order_number,
            customer_name: order.customers?.name
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
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent or queued' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in notify-new-order function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
