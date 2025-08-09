import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  console.log('🧪 اختبار ويب هوك التقارير المالية')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // إنشاء عميل Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // جلب عميل عشوائي للاختبار
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('id, name, whatsapp_number, phone')
      .limit(1)

    if (customerError || !customers || customers.length === 0) {
      console.error('❌ خطأ في جلب بيانات العملاء:', customerError)
      return new Response(JSON.stringify({ 
        error: 'لا توجد عملاء للاختبار' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const testCustomer = customers[0]
    const phone = testCustomer.whatsapp_number || testCustomer.phone || '+966500000000'

    console.log('📞 اختبار العميل:', testCustomer.name, 'الرقم:', phone)

    // إنشاء رسالة اختبار
    const testMessage = `
🧪 اختبار ويب هوك التقارير المالية

العميل: ${testCustomer.name}
الوقت: ${new Date().toLocaleString('ar-SA')}
الحالة: اختبار النظام

هذه رسالة اختبار للتأكد من عمل نظام إرسال التقارير المالية.
`

    console.log('📝 الرسالة:', testMessage)

    // حفظ رسالة الاختبار في قاعدة البيانات
    const { data: savedMessage, error: saveError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'test_system',
        to_number: phone,
        message_type: 'text',
        message_content: testMessage,
        status: 'pending',
        customer_id: testCustomer.id
      })
      .select()
      .single()

    if (saveError) {
      console.error('❌ خطأ في حفظ رسالة الاختبار:', saveError)
      return new Response(JSON.stringify({ 
        error: 'فشل في حفظ رسالة الاختبار',
        details: saveError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ تم حفظ رسالة الاختبار، ID:', savedMessage.id)

    // محاولة إرسال الرسالة عبر webhook
    let webhookResults = []
    
    const webhookUrls = [
      'https://n8n.srv894347.hstgr.cloud/webhook/ca719409-ac29-485a-99d4-3b602978eace'
    ]

    for (const webhookUrl of webhookUrls) {
      try {
        console.log(`📤 اختبار الويب هوك: ${webhookUrl}`)
        
        const startTime = Date.now()
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: phone,
            message: testMessage,
            customer_name: testCustomer.name,
            message_id: savedMessage.id,
            test_mode: true,
            timestamp: new Date().toISOString()
          })
        })
        const endTime = Date.now()

        const responseText = await webhookResponse.text()
        
        const result = {
          url: webhookUrl,
          status: webhookResponse.status,
          statusText: webhookResponse.statusText,
          success: webhookResponse.ok,
          response: responseText,
          responseTime: endTime - startTime,
          headers: Object.fromEntries(webhookResponse.headers.entries())
        }

        webhookResults.push(result)
        
        console.log(`📥 نتيجة الويب هوك:`, result)

        if (webhookResponse.ok) {
          // تحديث حالة الرسالة إلى sent
          await supabase
            .from('whatsapp_messages')
            .update({ 
              status: 'sent',
              error_message: null
            })
            .eq('id', savedMessage.id)
        } else {
          // تحديث حالة الرسالة إلى failed
          await supabase
            .from('whatsapp_messages')
            .update({ 
              status: 'failed',
              error_message: `Webhook test failed: ${webhookResponse.status} - ${responseText}`
            })
            .eq('id', savedMessage.id)
        }

      } catch (webhookError) {
        console.error(`❌ خطأ في الويب هوك ${webhookUrl}:`, webhookError)
        
        const result = {
          url: webhookUrl,
          success: false,
          error: webhookError.message,
          responseTime: 0
        }
        
        webhookResults.push(result)

        // تحديث حالة الرسالة إلى failed
        await supabase
          .from('whatsapp_messages')
          .update({ 
            status: 'failed',
            error_message: `Webhook test error: ${webhookError.message}`
          })
          .eq('id', savedMessage.id)
      }
    }

    // إحصائيات الاختبار
    const successful = webhookResults.filter(r => r.success).length
    const failed = webhookResults.filter(r => !r.success).length

    const response = {
      success: successful > 0,
      test_message_id: savedMessage.id,
      customer: {
        id: testCustomer.id,
        name: testCustomer.name,
        phone: phone
      },
      webhook_results: webhookResults,
      summary: {
        total_webhooks: webhookResults.length,
        successful: successful,
        failed: failed
      },
      timestamp: new Date().toISOString()
    }

    console.log('📊 نتائج الاختبار النهائية:', response)

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ خطأ عام في اختبار الويب هوك:', error)
    
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