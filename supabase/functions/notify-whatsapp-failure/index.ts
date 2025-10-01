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

    console.log('Checking for failed WhatsApp messages...');

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

    if (!settings.notify_whatsapp_failure || !settings.whatsapp_number) {
      console.log('WhatsApp failure notification is disabled or no WhatsApp number configured');
      return new Response(
        JSON.stringify({ message: 'Notification disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // البحث عن الرسائل الفاشلة في آخر 24 ساعة
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: failedMessages, error: messagesError } = await supabase
      .from('whatsapp_messages')
      .select('id, to_number, message_type, error_message, created_at')
      .eq('status', 'failed')
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (messagesError) {
      console.error('Failed to fetch failed messages:', messagesError);
      throw messagesError;
    }

    if (!failedMessages || failedMessages.length === 0) {
      console.log('No failed WhatsApp messages found');
      return new Response(
        JSON.stringify({ message: 'No failed messages' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${failedMessages.length} failed messages`);

    // تجميع الرسائل حسب نوع الفشل
    const messagesByType = failedMessages.reduce((acc, msg) => {
      const type = msg.message_type || 'unknown';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(msg);
      return acc;
    }, {} as Record<string, typeof failedMessages>);

    let reportText = `⚠️ *تنبيه: فشل في إرسال رسائل الواتساب*\n\n`;
    reportText += `📊 عدد الرسائل الفاشلة: ${failedMessages.length}\n`;
    reportText += `📅 الفترة: آخر 24 ساعة\n\n`;
    reportText += `📋 *التصنيف حسب النوع:*\n`;

    for (const [type, messages] of Object.entries(messagesByType)) {
      reportText += `• ${type}: ${messages.length} رسالة\n`;
    }

    reportText += `\n🔍 *أمثلة على الأخطاء:*\n`;
    
    const sampleErrors = failedMessages.slice(0, 3);
    sampleErrors.forEach((msg, index) => {
      const timestamp = new Date(msg.created_at).toLocaleTimeString('ar-SA');
      reportText += `\n${index + 1}. ${timestamp}\n`;
      reportText += `   رقم: ${msg.to_number}\n`;
      reportText += `   خطأ: ${msg.error_message || 'غير محدد'}\n`;
    });

    reportText += `\n⚠️ يرجى مراجعة النظام وإصلاح المشكلة.`;

    // حفظ التقرير
    const { error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: settings.whatsapp_number,
        message_type: 'whatsapp_failure_notification',
        message_content: reportText,
        status: 'pending',
        dedupe_key: `whatsapp_failure_${new Date().toISOString().split('T')[0]}_${Date.now()}`
      });

    if (insertError) {
      console.error('Failed to insert failure notification:', insertError);
      throw insertError;
    }

    console.log('WhatsApp failure notification created successfully');

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
            message: reportText,
            messageText: reportText,
            text: reportText,
            type: 'text',
            message_type: 'whatsapp_failure_notification',
            timestamp: Math.floor(Date.now() / 1000),
            from_number: 'system',
            failed_count: failedMessages.length
          }
        };

        const webhookResp = await fetch(settings.follow_up_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (webhookResp.ok) {
          console.log('✅ Sent via follow_up_webhook successfully');
          
          await supabase
            .from('whatsapp_messages')
            .update({ 
              status: 'sent', 
              sent_at: new Date().toISOString() 
            })
            .eq('dedupe_key', `whatsapp_failure_${new Date().toISOString().split('T')[0]}_${Date.now()}`)
            .limit(1);
        } else {
          console.warn('Follow_up_webhook failed, keeping pending');
        }
      } catch (webhookError) {
        console.error('Error sending via follow_up_webhook:', webhookError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Failure notification sent',
        failedCount: failedMessages.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in notify-whatsapp-failure function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
