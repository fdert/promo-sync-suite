import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('⚡ معالجة إشعارات المتابعة...');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Webhook-only mode: do not use Meta API directly
    console.log('🔌 Webhook-only mode enabled: skipping Meta API settings');

    // Get pending follow-up messages
    const { data: pendingMessages, error: fetchError } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('status', 'pending')
      .eq('message_type', 'follow_up_notification')
      .limit(50);

    if (fetchError) {
      console.error('❌ خطأ في جلب الرسائل:', fetchError);
      throw fetchError;
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      console.log('✅ لا توجد رسائل متابعة معلقة');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'لا توجد رسائل متابعة معلقة',
          processed: 0,
          failed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📨 معالجة ${pendingMessages.length} رسالة متابعة`);
    
    let processedCount = 0;
    let failedCount = 0;

    // Dispatch via webhook using the queue
    try {
      const { data: queueResult, error: queueError } = await supabase.functions.invoke('process-whatsapp-queue', {
        body: { source: 'process-follow-up-notifications', type: 'follow_up' }
      });
      if (queueError) {
        console.error('❌ خطأ في استدعاء process-whatsapp-queue:', queueError);
        failedCount = pendingMessages.length;
      } else {
        console.log('✅ تم استدعاء process-whatsapp-queue بنجاح:', queueResult);
        processedCount = queueResult?.processed_count ?? queueResult?.processed ?? 0;
        failedCount = queueResult?.failed_count ?? queueResult?.failed ?? 0;
      }
    } catch (invokeErr) {
      console.error('❌ استثناء أثناء استدعاء process-whatsapp-queue:', invokeErr);
      failedCount = pendingMessages.length;
    }

    console.log(`✅ انتهى: ${processedCount} نجح، ${failedCount} فشل`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `تم معالجة ${processedCount + failedCount} رسالة`,
        processed: processedCount,
        failed: failedCount,
        total_messages: pendingMessages.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ خطأ عام:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        processed: 0,
        failed: 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});