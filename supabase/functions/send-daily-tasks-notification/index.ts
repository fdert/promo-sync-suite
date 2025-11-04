import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // تحديد تاريخ اليوم في توقيت الرياض
    const today = new Date();
    const riyadhTime = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
    const todayDate = riyadhTime.toISOString().split('T')[0];

    console.log('Fetching daily tasks for date:', todayDate);

    // جلب جميع المهام لليوم الحالي
    const { data: tasks, error: tasksError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        delivery_date,
        created_by,
        customers (name),
        service_types (name)
      `)
      .eq('delivery_date', todayDate)
      .neq('status', 'مكتمل')
      .neq('status', 'جاهز للتسليم')
      .neq('status', 'ملغي');

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      throw tasksError;
    }

    console.log(`Found ${tasks?.length || 0} tasks for today`);

    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No tasks found for today' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // تجميع المهام حسب الموظف المسؤول (created_by)
    const tasksByEmployee = new Map<string, any[]>();
    
    for (const task of tasks) {
      const employeeId = task.created_by;
      if (!employeeId) continue;

      if (!tasksByEmployee.has(employeeId)) {
        tasksByEmployee.set(employeeId, []);
      }
      tasksByEmployee.get(employeeId)!.push(task);
    }

    console.log(`Tasks grouped for ${tasksByEmployee.size} employees`);

    // جلب معلومات الموظفين
    const employeeIds = Array.from(tasksByEmployee.keys());
    const { data: employees, error: employeesError } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .in('id', employeeIds);

    if (employeesError) {
      console.error('Error fetching employees:', employeesError);
      throw employeesError;
    }

    const employeesMap = new Map(employees?.map(emp => [emp.id, emp]) || []);

    // رسائل تحفيزية متنوعة
    const motivationalMessages = [
      '💪 ابدأ يومك بطاقة وحماس!',
      '🌟 النجاح ينتظرك، انطلق بثقة!',
      '🚀 يوم جديد مليء بالإنجازات!',
      '✨ أنت قادر على تحقيق المستحيل!',
      '💎 اجعل هذا اليوم مميزاً بإنجازاتك!',
      '🎯 ركز على أهدافك وحققها واحدة تلو الأخرى!',
      '🌈 كل مهمة تنجزها خطوة نحو النجاح!'
    ];

    let notificationsSent = 0;
    let notificationsFailed = 0;

    // إرسال الإشعارات لكل موظف
    for (const [employeeId, employeeTasks] of tasksByEmployee.entries()) {
      const employee = employeesMap.get(employeeId);
      
      if (!employee?.phone) {
        console.log(`No phone number for employee ${employeeId}`);
        notificationsFailed++;
        continue;
      }

      // اختيار رسالة تحفيزية عشوائية
      const randomMotivation = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

      // بناء رسالة المهام
      let message = `${randomMotivation}\n\n`;
      message += `🗓️ *مهام اليوم - ${new Date(todayDate).toLocaleDateString('ar-SA')}*\n\n`;
      message += `مرحباً ${employee.full_name || 'عزيزي الموظف'} 👋\n\n`;
      message += `لديك *${employeeTasks.length}* ${employeeTasks.length === 1 ? 'مهمة' : 'مهام'} مجدولة لهذا اليوم:\n\n`;

      // ترتيب المهام حسب الحالة
      const statusOrder = {
        'order_confirmed': 1,
        'in_production': 2,
        'under_review': 3,
        'design_proof': 4
      };

      employeeTasks.sort((a, b) => {
        const orderA = statusOrder[a.status as keyof typeof statusOrder] || 999;
        const orderB = statusOrder[b.status as keyof typeof statusOrder] || 999;
        return orderA - orderB;
      });

      employeeTasks.forEach((task, index) => {
        const statusEmoji = {
          'pending': '⏳',
          'قيد الانتظار': '⏳',
          'قيد التنفيذ': '⚙️',
          'in_progress': '⚙️',
          'قيد المراجعة': '🔍',
          'under_review': '🔍',
          'تصميم أولي': '🎨',
          'design_proof': '🎨'
        }[task.status] || '📋';

        const serviceName = task.service_types?.name || 'خدمة غير محددة';
        const customerName = task.customers?.name || 'عميل غير محدد';

        message += `${index + 1}. ${statusEmoji} *${serviceName}*\n`;
        message += `   📦 طلب رقم: ${task.order_number}\n`;
        message += `   👤 العميل: ${customerName}\n`;
        message += `   📊 الحالة: ${task.status}\n\n`;
      });

      message += `\n━━━━━━━━━━━━━━━\n`;
      message += `💼 *نصيحة اليوم:*\n`;
      message += `ابدأ بالمهام الأكثر أهمية، ولا تنسى أخذ فترات راحة قصيرة للحفاظ على تركيزك.\n\n`;
      message += `🎉 بالتوفيق في إنجاز مهامك اليوم!`;

      // إنشاء dedupe_key فريد لليوم والموظف
      const dedupeKey = `daily_tasks_${employeeId}_${todayDate}`;

      // إرسال الرسالة عبر إدراجها في جدول الرسائل
      const { error: messageError } = await supabase
        .from('whatsapp_messages')
        .insert({
          from_number: 'system',
          to_number: employee.phone,
          message_type: 'text',
          message_content: message,
          status: 'pending',
          is_reply: false,
          dedupe_key: dedupeKey
        });

      if (messageError) {
        if (messageError.code === '23505') {
          console.log(`Notification already sent today for employee ${employeeId}`);
        } else {
          console.error(`Error sending notification to employee ${employeeId}:`, messageError);
          notificationsFailed++;
        }
        continue;
      }

      console.log(`Notification sent to ${employee.full_name} (${employee.phone})`);
      notificationsSent++;
    }

    const result = {
      success: true,
      date: todayDate,
      totalTasks: tasks.length,
      employeesNotified: tasksByEmployee.size,
      notificationsSent,
      notificationsFailed,
      message: `تم إرسال ${notificationsSent} إشعار بنجاح`
    };

    console.log('Daily tasks notifications completed:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in send-daily-tasks-notification:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
