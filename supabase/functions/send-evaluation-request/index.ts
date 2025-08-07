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

    const requestBody = await req.json()
    console.log('Evaluation request received:', requestBody)

    const { 
      orderId, 
      customerId, 
      evaluationToken, 
      orderNumber, 
      serviceName,
      customerName,
      whatsappNumber 
    } = requestBody

    if (!orderId || !customerId || !evaluationToken) {
      throw new Error('Missing required parameters')
    }

    // إنشاء رابط التقييم
    const evaluationLink = `https://e5a7747a-0935-46df-9ea9-1308e76636dc.lovableproject.com/evaluation/${evaluationToken}`

    // إنشاء محتوى رسالة التقييم
    const message = `مرحباً ${customerName || 'عزيزنا العميل'}! 🎉

✅ طلبك رقم: ${orderNumber} تم إكماله بنجاح!

🌟 نرجو منك تقييم تجربتك معنا من خلال الرابط التالي:
${evaluationLink}

تقييمك مهم جداً لنا ويساعدنا على تحسين خدماتنا.

شكراً لاختيارك خدماتنا! 🙏`

    console.log('Evaluation message created:', message)

    // البحث عن webhook التقييم
    const { data: webhooks, error: webhookError } = await supabaseClient
      .from('webhook_settings')
      .select('*')
      .eq('webhook_type', 'evaluation')
      .eq('is_active', true)

    if (webhookError) {
      console.error('Error fetching webhooks:', webhookError)
      throw webhookError
    }

    console.log('Found evaluation webhooks:', webhooks)

    let webhookSent = false

    if (webhooks && webhooks.length > 0) {
      const webhook = webhooks[0]
      
      // إعداد البيانات للإرسال للـ webhook
      const payload = {
        to: whatsappNumber,
        phone: whatsappNumber,
        phoneNumber: whatsappNumber,
        message: message,
        messageText: message,
        text: message,
        customer_name: customerName,
        order_number: orderNumber,
        service_name: serviceName,
        evaluation_link: evaluationLink,
        type: 'evaluation_request',
        notification_type: 'evaluation_request',
        timestamp: Math.floor(Date.now() / 1000),
        order_id: orderId,
        evaluation_token: evaluationToken
      }

      console.log('Sending to webhook:', webhook.webhook_url)
      console.log('Payload:', payload)

      try {
        const webhookResponse = await fetch(webhook.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        })

        const webhookData = await webhookResponse.text()
        console.log('Webhook response status:', webhookResponse.status)
        console.log('Webhook response data:', webhookData)

        if (webhookResponse.ok) {
          webhookSent = true
          console.log('Webhook sent successfully')
        } else {
          console.error('Webhook failed with status:', webhookResponse.status)
        }
      } catch (webhookError) {
        console.error('Error sending to webhook:', webhookError)
      }
    }

    // حفظ الرسالة في قاعدة البيانات
    const { error: messageError } = await supabaseClient
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: whatsappNumber,
        message_type: 'text',
        message_content: message,
        status: webhookSent ? 'sent' : 'pending',
        customer_id: customerId
      })

    if (messageError) {
      console.error('Error saving message:', messageError)
    } else {
      console.log('Message saved to database')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Evaluation request sent successfully',
        webhookSent,
        evaluationLink
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in send-evaluation-request function:', error)
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