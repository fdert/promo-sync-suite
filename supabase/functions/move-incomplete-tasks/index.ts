import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 بدء عملية نقل المهام غير المنجزة...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // الحصول على تاريخ اليوم السابق
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];

    console.log(`📅 البحث عن المهام غير المنجزة بتاريخ: ${yesterdayDate}`);

    // جلب الطلبات التي لم تنجز من اليوم السابق
    const { data: incompleteTasks, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number, status, delivery_date, created_by')
      .eq('delivery_date', yesterdayDate)
      .not('status', 'in', '(completed,ready_for_delivery)');

    if (fetchError) {
      console.error('❌ خطأ في جلب المهام غير المنجزة:', fetchError);
      throw fetchError;
    }

    if (!incompleteTasks || incompleteTasks.length === 0) {
      console.log('✅ لا توجد مهام غير منجزة لنقلها');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'لا توجد مهام غير منجزة',
          moved: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📦 تم العثور على ${incompleteTasks.length} مهمة غير منجزة`);

    // تحديث تاريخ التسليم لليوم الحالي
    const today = new Date().toISOString().split('T')[0];
    const taskIds = incompleteTasks.map(task => task.id);

    const { error: updateError } = await supabase
      .from('orders')
      .update({ delivery_date: today })
      .in('id', taskIds);

    if (updateError) {
      console.error('❌ خطأ في تحديث تواريخ المهام:', updateError);
      throw updateError;
    }

    console.log(`✅ تم نقل ${incompleteTasks.length} مهمة إلى ${today}`);

    // إرسال إشعارات واتساب للموظفين المسؤولين
    const employeeIds = Array.from(new Set(incompleteTasks.map(task => task.created_by).filter(Boolean)));
    
    if (employeeIds.length > 0) {
      // جلب أرقام هواتف الموظفين
      const { data: employees, error: employeesError } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', employeeIds);

      if (!employeesError && employees) {
        // إرسال إشعار لكل موظف
        for (const employee of employees) {
          if (!employee.phone) continue;

          const employeeTasks = incompleteTasks.filter(task => task.created_by === employee.id);
          const taskNumbers = employeeTasks.map(t => t.order_number).join('، ');

          const messageContent = `🔔 تذكير بالمهام غير المنجزة\n\n` +
            `مرحباً ${employee.full_name || 'عزيزي الموظف'}،\n\n` +
            `لديك ${employeeTasks.length} مهمة لم يتم إنجازها بالأمس:\n` +
            `${taskNumbers}\n\n` +
            `تم نقل هذه المهام تلقائياً إلى مهام اليوم.\n` +
            `يرجى متابعتها وإنجازها في أقرب وقت.`;

          const normalizedPhone = employee.phone.startsWith('+')
            ? employee.phone
            : (employee.phone.startsWith('966')
                ? `+${employee.phone}`
                : employee.phone.replace(/^0/, '+966'));

          await supabase
            .from('whatsapp_messages')
            .insert({
              to_number: normalizedPhone,
              message_type: 'task_reminder',
              message_content: messageContent,
              status: 'pending',
              is_reply: false,
            });

          console.log(`📱 تم إرسال إشعار واتساب إلى ${employee.full_name}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `تم نقل ${incompleteTasks.length} مهمة غير منجزة إلى اليوم`,
        moved: incompleteTasks.length,
        tasks: incompleteTasks.map(t => ({
          order_number: t.order_number,
          status: t.status
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ خطأ في معالجة المهام غير المنجزة:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
