import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Listen to notifications from database
let notificationListener: any = null;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Start listening to notifications if not already listening
  if (!notificationListener) {
    notificationListener = supabase
      .channel('pg_notify')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public',
          table: 'orders'
        },
        async (payload) => {
          console.log('📥 تغيير في الطلبات:', payload);
          
          // إذا تم تحديث الطلب إلى "مكتمل"، أرسل رسالة التقييم
          if (payload.eventType === 'UPDATE' && 
              payload.new?.status === 'مكتمل' && 
              payload.old?.status !== 'مكتمل') {
            
            console.log('🎯 طلب اكتمل - إرسال رسالة تقييم فورية');
            
            // استدعاء دالة الإرسال الفوري
            try {
              const response = await fetch(`${supabaseUrl}/functions/v1/send-google-review-immediately`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`
                },
                body: JSON.stringify({ orderId: payload.new.id })
              });
              
              if (response.ok) {
                console.log('✅ تم إرسال رسالة التقييم الفورية بنجاح');
              } else {
                console.error('❌ فشل في إرسال رسالة التقييم:', await response.text());
              }
            } catch (error) {
              console.error('❌ خطأ في استدعاء دالة الإرسال:', error);
            }
          }
        }
      )
      .subscribe();
      
    console.log('🔔 بدء الاستماع للإشعارات...');
  }

  try {
    const { action, orderId } = await req.json();
    
    if (action === 'send_review' && orderId) {
      console.log('📲 طلب إرسال رسالة تقييم فوري للطلب:', orderId);
      
      // استدعاء دالة الإرسال الفوري
      const response = await fetch(`${supabaseUrl}/functions/v1/send-google-review-immediately`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ orderId })
      });
      
      const result = await response.text();
      
      return new Response(
        JSON.stringify({ 
          success: response.ok,
          message: response.ok ? 'Review message sent successfully' : 'Failed to send review message',
          details: result
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.ok ? 200 : 500
        }
      );
    }
    
    return new Response(
      JSON.stringify({ message: 'Review notification service is running' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('خطأ في خدمة الإشعارات:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Service error', 
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});