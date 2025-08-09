import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  console.log('🚀 تم استدعاء edge function المحسن لإرسال الواتساب')
  
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
    
    const { phone, message, customer_name, message_id } = body
    
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

    let savedMessageId = message_id;

    // حفظ الرسالة في قاعدة البيانات إذا لم تكن محفوظة مسبقاً
    if (!message_id) {
      console.log('💾 حفظ الرسالة في قاعدة البيانات...')
      
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

      savedMessageId = messageData.id;
      console.log('✅ تم حفظ الرسالة بنجاح، ID:', savedMessageId)
    }

    // محاولة إرسال الرسالة عبر عدة طرق
    const webhookUrls = [
      'https://n8n.srv894347.hstgr.cloud/webhook/ca719409-ac29-485a-99d4-3b602978eace',
      // يمكن إضافة URLs احتياطية أخرى هنا
    ];

    let success = false;
    let lastError = '';
    
    for (const webhookUrl of webhookUrls) {
      try {
        console.log(`📤 محاولة إرسال للويب هوك: ${webhookUrl}`)
        
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: phone,
            message: message,
            customer_name: customer_name || 'غير محدد',
            message_id: savedMessageId,
            timestamp: new Date().toISOString(),
            source: 'improved_edge_function'
          })
        })

        const webhookResponseText = await webhookResponse.text()
        console.log(`📥 استجابة الويب هوك ${webhookUrl}:`, webhookResponse.status, webhookResponseText)

        if (webhookResponse.ok) {
          success = true;
          
          // تحديث حالة الرسالة إلى sent
          await supabase
            .from('whatsapp_messages')
            .update({ 
              status: 'sent',
              error_message: null
            })
            .eq('id', savedMessageId)
          
          console.log('✅ تم إرسال الرسالة بنجاح عبر:', webhookUrl)
          break; // توقف عند أول نجاح
        } else {
          lastError = `Webhook ${webhookUrl} error: ${webhookResponse.status} - ${webhookResponseText}`;
          console.log('⚠️', lastError)
        }
        
      } catch (error) {
        lastError = `Webhook ${webhookUrl} failed: ${error.message}`;
        console.error('❌', lastError)
        continue; // جرب الويب هوك التالي
      }
    }

    if (!success) {
      // تحديث حالة الرسالة إلى failed
      await supabase
        .from('whatsapp_messages')
        .update({ 
          status: 'failed',
          error_message: lastError
        })
        .eq('id', savedMessageId)
      
      return new Response(JSON.stringify({ 
        success: false,
        error: 'فشل في إرسال الرسالة عبر جميع الطرق',
        message_id: savedMessageId,
        details: lastError
      }), {
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      })
    }

    // النجاح!
    const response = {
      success: true,
      message_id: savedMessageId,
      phone: phone,
      customer_name: customer_name,
      message_status: 'sent',
      timestamp: new Date().toISOString(),
      method: 'improved_edge_function'
    }

    console.log('✅ العملية مكتملة بنجاح:', response)

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