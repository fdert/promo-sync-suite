import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  console.log('🔄 معالج الرسائل المعلقة بدأ العمل')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // إنشاء عميل Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // جلب الرسائل المعلقة (غير المرسلة)
    const { data: pendingMessages, error: fetchError } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10) // معالجة 10 رسائل في كل مرة

    if (fetchError) {
      console.error('❌ خطأ في جلب الرسائل المعلقة:', fetchError)
      return new Response(JSON.stringify({ 
        error: 'فشل في جلب الرسائل المعلقة',
        details: fetchError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      console.log('✅ لا توجد رسائل معلقة للمعالجة')
      return new Response(JSON.stringify({ 
        success: true,
        message: 'لا توجد رسائل معلقة',
        processed: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`📨 تم العثور على ${pendingMessages.length} رسالة معلقة`)

    let successCount = 0
    let failedCount = 0

    // معالجة كل رسالة معلقة
    for (const message of pendingMessages) {
      try {
        console.log(`📤 معالجة رسالة ID: ${message.id} للرقم: ${message.to_number}`)

        // لا إرسال مباشر هنا؛ نستخدم معالج مركزي في وظيفة أخرى
        try {
          await supabase.functions.invoke('process-whatsapp-queue', { body: { trigger: 'send-pending-whatsapp' } });
          console.log('Delegated pending messages to process-whatsapp-queue');
        } catch (e) {
          console.warn('process-whatsapp-queue invoke failed (ignored):', e?.message || e);
        }

        // نُبقي الحالة معلقة وسيتم تحديثها من المعالج المركزي
        successCount++

          
          failedCount++
        }

      } catch (messageError) {
        console.error(`❌ خطأ في معالجة الرسالة ${message.id}:`, messageError)
        
        // تحديث حالة الرسالة إلى failed
        await supabase
          .from('whatsapp_messages')
          .update({ 
            status: 'failed',
            error_message: `Processing error: ${messageError.message}`
          })
          .eq('id', message.id)
        
        failedCount++
      }

      // انتظار قصير بين الرسائل لتجنب إرهاق الخادم
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    const response = {
      success: true,
      processed: pendingMessages.length,
      successful: successCount,
      failed: failedCount,
      timestamp: new Date().toISOString()
    }

    console.log('📊 نتائج المعالجة:', response)

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ خطأ عام في معالج الرسائل المعلقة:', error)
    
    return new Response(JSON.stringify({ 
      error: 'خطأ في الخادم',
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})