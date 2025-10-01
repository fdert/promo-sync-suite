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
    const { data: inserted, error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: settings.whatsapp_number,
        message_type: 'expense_notification',
        message_content: message,
        status: 'pending',
        dedupe_key: `expense_${expenseId}_${Date.now()}`
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to insert expense notification:', insertError);
      throw insertError;
    }

    const messageId = inserted?.id;

    console.log('Expense notification saved successfully');

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
            message_type: 'expense_notification',
            timestamp: Math.floor(Date.now() / 1000),
            from_number: 'system',
            expense_id: expenseId
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
