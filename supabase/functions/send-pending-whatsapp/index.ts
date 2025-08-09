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

        // محاولة إرسال الرسالة عبر webhook
        const webhookResponse = await fetch('https://n8n.srv894347.hstgr.cloud/webhook/ca719409-ac29-485a-99d4-3b602978eace', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: message.to_number,
            message: message.message_content,
            customer_name: 'عميل',
            message_id: message.id,
            source: 'pending_processor'
          })
        })

        if (webhookResponse.ok) {
          // تحديث حالة الرسالة إلى sent
          const { error: updateError } = await supabase
            .from('whatsapp_messages')
            .update({ 
              status: 'sent',
              error_message: null
            })
            .eq('id', message.id)

          if (updateError) {
            console.error(`❌ خطأ في تحديث حالة الرسالة ${message.id}:`, updateError)
          } else {
            console.log(`✅ تم إرسال الرسالة ${message.id} بنجاح`)
            successCount++
          }
        } else {
          const errorText = await webhookResponse.text()
          console.error(`❌ فشل إرسال الرسالة ${message.id}:`, webhookResponse.status, errorText)
          
          // تحديث حالة الرسالة إلى failed
          await supabase
            .from('whatsapp_messages')
            .update({ 
              status: 'failed',
              error_message: `Webhook error: ${webhookResponse.status} - ${errorText}`
            })
            .eq('id', message.id)
          
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