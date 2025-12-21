import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { renderTemplate } from '../_shared/template-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// خريطة ربط حالات الطلب بأسماء القوالب
const STATUS_TEMPLATE_MAP: Record<string, string> = {
  'جديد': 'order_created',
  'pending': 'order_created',
  'مؤكد': 'order_confirmed',
  'confirmed': 'order_confirmed',
  'قيد التنفيذ': 'order_in_progress',
  'in_progress': 'order_in_progress',
  'قيد المراجعة': 'order_under_review',
  'جاهز للتسليم': 'order_ready_for_delivery',
  'مكتمل': 'order_completed',
  'completed': 'order_completed',
  'ملغي': 'order_cancelled',
  'cancelled': 'order_cancelled',
  'مؤجل': 'order_on_hold',
  'قيد الانتظار': 'order_on_hold'
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

    const { order_id, new_status, old_status } = await req.json();
    
    console.log('📨 إرسال إشعار تحديث حالة الطلب:', { order_id, new_status, old_status });

    if (!order_id || !new_status) {
      return new Response(
        JSON.stringify({ error: 'order_id و new_status مطلوبان' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // منع التكرار إذا لم تتغير الحالة فعلياً
    if (old_status && String(old_status) === String(new_status)) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'status_not_changed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // جلب تفاصيل الطلب والعميل
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        customers(id, name, phone, whatsapp),
        service_types(id, name)
      `)
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      console.error('خطأ في جلب الطلب:', orderError);
      return new Response(
        JSON.stringify({ error: 'الطلب غير موجود' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // التأكد من وجود رقم واتساب للعميل
    const customerPhone = order.customers?.whatsapp || order.customers?.phone;
    if (!customerPhone) {
      console.log('❌ لا يوجد رقم واتساب للعميل');
      return new Response(
        JSON.stringify({ error: 'لا يوجد رقم واتساب للعميل' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // تنظيف رقم الهاتف وتحويله لصيغة E.164
    const cleanPhone = (phone: string) => {
      const cleaned = phone.replace(/[^\d+]/g, '');
      return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
    };
    const toNumber = cleanPhone(customerPhone);

    // تحديد القالب المناسب للحالة، مع استخدام قالب عام في حال عدم وجود قالب مخصص
    const templateName = STATUS_TEMPLATE_MAP[new_status] || 'order_status_updated';
    
    console.log(`📋 استخدام القالب: ${templateName}`);

    // حساب المبالغ
    const totalAmount = Number(order.total_amount || 0);
    const paidAmount = Number(order.paid_amount || 0);
    const remainingAmount = Math.max(0, totalAmount - paidAmount);

    // جلب بنود الطلب
    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order_id);

    const orderItems = items?.map(item => 
      `• ${item.item_name}: ${item.quantity || 1} × ${(item.unit_price || 0).toFixed(2)} = ${(item.total || 0).toFixed(2)} ر.س`
    ).join('\n') || 'لا توجد بنود';

    // جلب الدفعات
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', order_id)
      .order('payment_date', { ascending: false });

    const paymentsDetails = payments?.map(p => 
      `• ${new Date(p.payment_date || '').toLocaleDateString('ar-SA')}: ${(p.amount || 0).toFixed(2)} ر.س (${p.payment_type})`
    ).join('\n') || 'لا توجد دفعات مسجلة';

    // للحالة "مكتمل" - جلب أو إنشاء رابط التقييم
    let evaluationLink = '';
    let evaluationCode = '';
    
    if (new_status === 'مكتمل' || new_status === 'completed') {
      const { data: existingEval } = await supabase
        .from('evaluations')
        .select('evaluation_token')
        .eq('order_id', order_id)
        .maybeSingle();

      if (existingEval?.evaluation_token) {
        evaluationLink = `https://id-preview--e5a7747a-0935-46df-9ea9-1308e76636dc.lovable.app/evaluation/${existingEval.evaluation_token}`;
        evaluationCode = existingEval.evaluation_token.slice(-5).toUpperCase();
      } else {
        // إنشاء evaluation جديد
        const evalToken = crypto.randomUUID();
        const { data: newEval } = await supabase
          .from('evaluations')
          .insert({
            customer_id: order.customer_id,
            order_id: order_id,
            evaluation_token: evalToken,
            sent_at: new Date().toISOString()
          })
          .select('evaluation_token')
          .single();

        if (newEval) {
          evaluationLink = `https://id-preview--e5a7747a-0935-46df-9ea9-1308e76636dc.lovable.app/evaluation/${newEval.evaluation_token}`;
          evaluationCode = newEval.evaluation_token.slice(-5).toUpperCase();
        }
      }
    }

    // المتغيرات للقالب
    const variables = {
      customer_name: order.customers?.name || 'عزيزنا العميل',
      customer_phone: customerPhone,
      order_number: order.order_number || '',
      order_status: new_status,
      service_name: order.service_types?.name || 'الخدمة',
      amount: totalAmount.toFixed(2),
      paid_amount: paidAmount.toFixed(2),
      remaining_amount: remainingAmount.toFixed(2),
      order_items: orderItems,
      payments_details: paymentsDetails,
      delivery_date: order.delivery_date 
        ? new Date(order.delivery_date).toLocaleDateString('ar-SA') 
        : 'سيتم تحديده',
      delivery_time: order.estimated_delivery_time || '',
      estimated_time: order.estimated_delivery_time || 'قريباً',
      company_name: 'إدارة المتابعة',
      progress: '50',
      description: order.notes || '',
      evaluation_link: evaluationLink,
      evaluation_code: evaluationCode,
      timestamp: new Date().toLocaleString('ar-SA')
    };

    // استخدام القالب لتوليد نص الرسالة
    const messageContent = await renderTemplate(supabase, templateName, variables);

    if (!messageContent) {
      console.error(`❌ فشل في جلب القالب: ${templateName}`);
      return new Response(
        JSON.stringify({ error: `فشل في جلب القالب: ${templateName}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('📝 محتوى الرسالة المولدة من القالب:', messageContent.substring(0, 100) + '...');

    // ✅ منع التكرار: نفس الطلب + نفس الحالة خلال نافذة قصيرة
    // (هذا يمنع تكرار رسائل العميل وإدارة المتابعة إذا تم استدعاء الدالة عدة مرات)
    const dedupeKey = `order_status_${order_id}_${new_status}`;
    const dedupeSince = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const { data: existingMessage, error: existingErr } = await supabase
      .from('whatsapp_messages')
      .select('id, created_at, status')
      .eq('dedupe_key', dedupeKey)
      .gte('created_at', dedupeSince)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingErr) {
      console.warn('⚠️ تعذر التحقق من التكرار (سيستمر الإرسال):', existingErr);
    }

    if (existingMessage?.id) {
      return new Response(
        JSON.stringify({
          success: true,
          deduped: true,
          message: 'تم تجاهل الإرسال المكرر لنفس الحالة',
          existing_message_id: existingMessage.id,
          template_used: templateName,
          to_number: toNumber
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // إدراج الرسالة في جدول whatsapp_messages
    const { data: insertedMessage, error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: toNumber,
        message_type: `order_status_${new_status}`,
        message_content: messageContent,
        status: 'pending',
        customer_id: order.customer_id,
        dedupe_key: dedupeKey
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('❌ خطأ في إدراج الرسالة:', insertError);
      return new Response(
        JSON.stringify({ error: 'فشل في إدراج الرسالة', details: insertError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('✅ تم إدراج الرسالة في الطابور:', insertedMessage?.id);

    // استدعاء معالج الطابور
    try {
      await supabase.functions.invoke('process-whatsapp-queue', {
        body: { 
          trigger: 'order_status_update',
          order_id: order_id,
          message_id: insertedMessage?.id 
        }
      });
      console.log('✅ تم استدعاء معالج الطابور');
    } catch (queueError) {
      console.warn('⚠️ فشل استدعاء معالج الطابور (سيتم المعالجة لاحقاً):', queueError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'تم جدولة إرسال الإشعار بنجاح',
        message_id: insertedMessage?.id,
        template_used: templateName,
        to_number: toNumber
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ خطأ عام:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
