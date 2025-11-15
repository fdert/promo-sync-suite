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

    const { orderId, test } = await req.json();

    console.log('Processing new order notification:', { orderId, test });

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

    let order;
    
    // في حالة الاختبار، إنشاء بيانات وهمية
    if (test) {
      console.log('Test mode: Creating dummy order data');
      order = {
        id: 'test-order-id',
        order_number: 'ORD-TEST-12345',
        status: 'pending',
        total_amount: 1500,
        paid_amount: 500,
        delivery_date: new Date(Date.now() + 86400000).toISOString(),
        notes: 'طلب تجريبي لاختبار نظام الإشعارات',
        created_at: new Date().toISOString(),
        customers: {
          name: 'عميل تجريبي',
          phone: '+966501234567',
          whatsapp: '+966501234567'
        },
        service_types: {
          name: 'خدمة تجريبية'
        },
        order_items: [
          {
            item_name: 'منتج تجريبي 1',
            quantity: 2,
            unit_price: 500,
            total: 1000,
            description: 'وصف المنتج التجريبي الأول'
          },
          {
            item_name: 'منتج تجريبي 2',
            quantity: 1,
            unit_price: 500,
            total: 500,
            description: 'وصف المنتج التجريبي الثاني'
          }
        ]
      };
    } else {
      // جلب تفاصيل الطلب الحقيقية
      const { data: fetchedOrder, error: orderError } = await supabase
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

      if (orderError || !fetchedOrder) {
        console.error('Failed to fetch order details:', orderError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch order' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      order = fetchedOrder;
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

${test ? '🧪 *هذه رسالة اختبار*' : 'يرجى متابعة الطلب والتواصل مع العميل.'}`;

    // حفظ الرسالة في قاعدة البيانات
    const { data: inserted, error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: settings.whatsapp_number,
        message_type: 'new_order_notification',
        message_content: message,
        status: 'pending',
        dedupe_key: `new_order_${test ? 'test' : orderId}_${Date.now()}`
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to insert WhatsApp message:', insertError);
      throw insertError;
    }

    const messageId = inserted?.id;

    console.log('New order notification saved successfully');

    // استبدال الإرسال المباشر: استدعاء معالج الطابور فقط
    try {
      await supabase.functions.invoke('process-whatsapp-queue', {
        body: { trigger: 'notify-new-order', message_id: messageId }
      });
      console.log('Triggered process-whatsapp-queue for new order');
    } catch (e) {
      console.warn('process-whatsapp-queue invoke failed (ignored):', e?.message || e);
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
