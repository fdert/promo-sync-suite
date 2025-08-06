import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('معالجة رسائل التقييم مع روابط جوجل...')

    // جلب رسائل التقييم المعلقة (التي لها customer_id وتحتوي على رابط جوجل)
    const { data: pendingMessages, error: fetchError } = await supabaseClient
      .from('whatsapp_messages')
      .select('*')
      .eq('status', 'pending')
      .not('customer_id', 'is', null)
      .like('message_content', '%search.google.com%')
      .limit(10)

    if (fetchError) {
      console.error('خطأ في جلب الرسائل:', fetchError)
      throw fetchError
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      console.log('لا توجد رسائل تقييم معلقة')
      return new Response(
        JSON.stringify({ success: true, message: 'لا توجد رسائل تقييم معلقة' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`تم العثور على ${pendingMessages.length} رسالة تقييم معلقة`)

    // جلب إعدادات الويب هوك النشطة
    const { data: webhooks, error: webhookError } = await supabaseClient
      .from('webhook_settings')
      .select('*')
      .eq('is_active', true)
      .eq('webhook_type', 'outgoing')

    if (webhookError || !webhooks || webhooks.length === 0) {
      console.error('لا توجد ويب هوك نشطة')
      throw new Error('لا توجد ويب هوك نشطة')
    }

    // اختيار أول ويب هوك نشط
    const webhook = webhooks[0]
    console.log(`استخدام الويب هوك: ${webhook.webhook_name}`)

    let successCount = 0
    let errorCount = 0

    // إرسال كل رسالة تقييم
    for (const message of pendingMessages) {
      try {
        console.log(`إرسال رسالة تقييم إلى: ${message.to_number}`)

        // إعداد البيانات للإرسال
        const payload = {
          to: message.to_number,
          phone: message.to_number,
          phoneNumber: message.to_number,
          message: message.message_content,
          messageText: message.message_content,
          text: message.message_content,
          type: 'google_review',
          timestamp: Math.floor(Date.now() / 1000),
          message_id: message.id
        }

        // إرسال للويب هوك
        const webhookResponse = await fetch(webhook.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        console.log(`حالة الويب هوك: ${webhookResponse.status}`)

        if (webhookResponse.ok) {
          // تحديث حالة الرسالة إلى sent
          await supabaseClient
            .from('whatsapp_messages')
            .update({ status: 'sent' })
            .eq('id', message.id)

          successCount++
          console.log(`تم إرسال رسالة التقييم بنجاح: ${message.id}`)
        } else {
          // تحديث حالة الرسالة إلى failed
          await supabaseClient
            .from('whatsapp_messages')
            .update({ status: 'failed' })
            .eq('id', message.id)

          errorCount++
          console.error(`فشل في إرسال رسالة التقييم: ${message.id}`)
        }

      } catch (messageError) {
        console.error(`خطأ في إرسال الرسالة ${message.id}:`, messageError)
        
        // تحديث حالة الرسالة إلى failed
        await supabaseClient
          .from('whatsapp_messages')
          .update({ status: 'failed' })
          .eq('id', message.id)
        
        errorCount++
      }
    }

    console.log(`تم إرسال ${successCount} رسالة بنجاح، فشل ${errorCount} رسالة`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `تم إرسال ${successCount} رسالة تقييم بنجاح`,
        successCount,
        errorCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('خطأ في معالجة رسائل التقييم:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})