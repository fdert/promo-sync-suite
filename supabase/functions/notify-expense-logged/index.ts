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

    const { expenseId, expenseType, amount, description } = await req.json();

    console.log('Processing expense notification:', { expenseId, expenseType, amount });

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

    const message = `💸 *مصروف جديد مسجل*

📋 نوع المصروف: ${expenseType}
💰 المبلغ: ${amount} ريال
📝 الوصف: ${description || 'غير محدد'}

⏰ تاريخ التسجيل: ${new Date().toLocaleString('ar-SA')}

تم تسجيل المصروف في النظام بنجاح.`;

    // حفظ الرسالة
    const { error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: settings.whatsapp_number,
        message_type: 'expense_notification',
        message_content: message,
        status: 'pending',
        dedupe_key: `expense_${expenseId}_${Date.now()}`
      });

    if (insertError) {
      console.error('Failed to insert expense notification:', insertError);
      throw insertError;
    }

    console.log('Expense notification saved successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in notify-expense-logged function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
