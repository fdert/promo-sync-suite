import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  console.log('🚀 تم استدعاء edge function لإرسال الواتساب')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  try {
    const body = await req.json()
    console.log('📨 البيانات المستلمة:', body)
    
    const { phone, message, customer_name } = body
    
    if (!phone || !message) {
      return new Response(JSON.stringify({ 
        error: 'مطلوب: phone و message' 
      }), {
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      })
    }

    // إنشاء عميل Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('💾 حفظ الرسالة في قاعدة البيانات...')
    
    // حفظ الرسالة في قاعدة البيانات أولاً
    const { data: messageData, error: saveError } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: phone,
        message_type: 'text',
        message_content: message,
        status: 'pending'
      })
      .select()
      .single()

    if (saveError) {
      console.error('❌ خطأ في حفظ الرسالة:', saveError)
      return new Response(JSON.stringify({ 
        error: 'فشل في حفظ الرسالة',
        details: saveError.message 
      }), {
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      })
    }

    console.log('✅ تم حفظ الرسالة بنجاح، ID:', messageData.id)

    // إرسال الرسالة عبر الويب هوك
    console.log('📤 إرسال الرسالة للويب هوك...')
    
    const webhookUrl = 'https://n8n.srv894347.hstgr.cloud/webhook/ca719409-ac29-485a-99d4-3b602978eace'
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: phone,
        message: message,
        customer_name: customer_name || 'غير محدد',
        message_id: messageData.id,
        timestamp: new Date().toISOString()
      })
    })

    const webhookResponseText = await webhookResponse.text()
    console.log('📥 استجابة الويب هوك:', webhookResponse.status, webhookResponseText)

    // تحديث حالة الرسالة حسب نتيجة الويب هوك
    const newStatus = webhookResponse.ok ? 'sent' : 'failed'
    
    const { error: updateError } = await supabase
      .from('whatsapp_messages')
      .update({ 
        status: newStatus,
        error_message: webhookResponse.ok ? null : `Webhook error: ${webhookResponse.status} - ${webhookResponseText}`
      })
      .eq('id', messageData.id)

    if (updateError) {
      console.error('❌ خطأ في تحديث حالة الرسالة:', updateError)
    }

    // في كل الأحوال، نرد بنجاح للمستخدم مع تفاصيل التشخيص
    const response = {
      success: true,
      message_id: messageData.id,
      phone: phone,
      customer_name: customer_name,
      webhook_status: webhookResponse.status,
      webhook_response: webhookResponseText,
      message_status: newStatus,
      timestamp: new Date().toISOString(),
      diagnostic_info: {
        function_name: 'send-whatsapp-direct',
        webhook_url: webhookUrl,
        phone_clean: phone,
        message_length: message.length,
        environment: 'supabase-edge-function'
      }
    }

    console.log('✅ العملية مكتملة:', response)

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('❌ خطأ في edge function:', error)
    
    return new Response(JSON.stringify({ 
      error: 'خطأ في الخادم',
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })
  }
})