import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 بدء تحديث المهام اليومية...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // استخدام التوقيت السعودي
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }))
      .toISOString()
      .split('T')[0];
    console.log(`📅 تاريخ اليوم بتوقيت السعودية: ${today}`);

    // جلب الطلبات التي تاريخ تسليمها اليوم
    const { data: todayOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number, delivery_date, created_by, customers(name)')
      .eq('delivery_date', today);

    if (fetchError) {
      console.error('❌ خطأ في جلب الطلبات:', fetchError);
      throw fetchError;
    }

    console.log(`📋 تم العثور على ${todayOrders?.length || 0} طلبات لليوم`);

    if (!todayOrders || todayOrders.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'لا توجد طلبات لليوم',
          date: today,
          orders_count: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // تسجيل تفاصيل الطلبات
    console.log('الطلبات المعالجة:');
    todayOrders.forEach(order => {
      console.log(`- ${order.order_number}: ${order.customers?.name || 'غير محدد'}`);
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'تم تحديث المهام اليومية بنجاح',
        date: today,
        orders_count: todayOrders.length,
        orders: todayOrders.map(o => ({
          order_number: o.order_number,
          customer_name: o.customers?.name || 'غير محدد',
          assigned_to: o.created_by
        }))
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ خطأ في تحديث المهام اليومية:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'حدث خطأ أثناء تحديث المهام اليومية'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
