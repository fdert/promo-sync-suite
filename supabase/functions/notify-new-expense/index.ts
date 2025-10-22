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

    const { expense_id, test } = await req.json();

    console.log('Processing new expense notification:', { expense_id, test });

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

    if (!settings.notify_expense_logged || !settings.whatsapp_number) {
      console.log('Expense notification is disabled or no WhatsApp number configured');
      return new Response(
        JSON.stringify({ message: 'Notification disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    let expense;
    let expenseDate;
    let createdDate;
    
    // في حالة الاختبار، إنشاء بيانات وهمية
    if (test) {
      console.log('Test mode: Creating dummy expense data');
      const now = new Date();
      expense = {
        id: 'test-expense-id',
        expense_type: 'مصروف تجريبي',
        description: 'مصروف اختبار لنظام الإشعارات',
        amount: 500.00,
        expense_date: now.toISOString(),
        payment_method: 'نقدي',
        receipt_number: 'TEST-001',
        notes: 'هذا مصروف تجريبي لاختبار النظام',
        created_at: now.toISOString()
      };
      expenseDate = now.toLocaleDateString('ar-SA');
      createdDate = now.toLocaleDateString('ar-SA');
    } else {
      if (!expense_id) {
        return new Response(
          JSON.stringify({ error: 'expense_id is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      // جلب تفاصيل المصروف الحقيقية
      const { data: fetchedExpense, error: expenseError } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', expense_id)
        .single();

      if (expenseError || !fetchedExpense) {
        console.error('Failed to fetch expense details:', expenseError);
        return new Response(
          JSON.stringify({ error: 'Expense not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }
      
      expense = fetchedExpense;
      expenseDate = new Date(expense.expense_date).toLocaleDateString('ar-SA');
      createdDate = new Date(expense.created_at).toLocaleDateString('ar-SA');
    }

    const message = `💸 *إشعار: تسجيل مصروف جديد*

📝 نوع المصروف: ${expense.expense_type}
${expense.description ? `📋 الوصف: ${expense.description}` : ''}

━━━━━━━━━━━━━━━━━━━━

💰 تفاصيل المصروف:
• المبلغ: ${expense.amount.toFixed(2)} ر.س
• تاريخ المصروف: ${expenseDate}
${expense.payment_method ? `• طريقة الدفع: ${expense.payment_method}` : ''}
${expense.receipt_number ? `• رقم الإيصال: ${expense.receipt_number}` : ''}

━━━━━━━━━━━━━━━━━━━━

${expense.notes ? `📌 ملاحظات:\n${expense.notes}\n\n━━━━━━━━━━━━━━━━━━━━\n` : ''}
📅 تاريخ التسجيل: ${createdDate}
⏰ الوقت: ${new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}

${test ? '\n🧪 *هذه رسالة اختبار*' : ''}`;

    const { data: msgInserted, error: msgInsertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: settings.whatsapp_number,
        message_type: 'expense_notification',
        message_content: message,
        status: 'pending',
        dedupe_key: `expense_logged_${test ? 'test' : expense_id}_${Date.now()}`
      })
      .select('id')
      .single();

    if (msgInsertError) {
      console.error('Failed to insert expense notification:', msgInsertError);
      throw msgInsertError;
    }

    // إرسال مباشر عبر follow_up_webhook_url إذا كان موجوداً
    if (settings.follow_up_webhook_url) {
      try {
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
            message_type: 'expense_notification',
            timestamp: Math.floor(Date.now() / 1000),
            from_number: 'system',
            expense_id: expense_id
          }
        };

        const webhookResp = await fetch(settings.follow_up_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (webhookResp.ok && msgInserted?.id) {
          await supabase
            .from('whatsapp_messages')
            .update({ 
              status: 'sent', 
              sent_at: new Date().toISOString() 
            })
            .eq('id', msgInserted.id);
          
          console.log('✅ Expense notification sent successfully');
        }
      } catch (webhookError) {
        console.error('Error sending via follow_up_webhook:', webhookError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Expense notification created' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in notify-new-expense function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});