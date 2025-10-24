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

    const { evaluationId } = await req.json()

    if (!evaluationId) {
      throw new Error('evaluation ID is required')
    }

    // جلب معلومات التقييم والعميل
    const { data: evaluation, error: evalError } = await supabaseClient
      .from('evaluations')
      .select(`
        *,
        customers (name, whatsapp),
        orders (order_number)
      `)
      .eq('id', evaluationId)
      .single()

    if (evalError || !evaluation) {
      throw new Error('Evaluation not found')
    }

    // جلب إعدادات خرائط جوجل
    const { data: settings, error: settingsError } = await supabaseClient
      .from('google_maps_settings')
      .select('*')
      .single()

    if (settingsError || !settings) {
      throw new Error('Google Maps settings not configured')
    }

    // إنشاء رابط التقييم
    const reviewLink = `https://search.google.com/local/writereview?placeid=${settings.place_id}`

    // تحديث التقييم برابط التقييم
    const { error: updateError } = await supabaseClient
      .from('evaluations')
      .update({
        google_review_link: reviewLink,
        google_review_status: 'sent_to_customer',
        google_review_sent_at: new Date().toISOString()
      })
      .eq('id', evaluationId)

    if (updateError) {
      throw updateError
    }

    // إنشاء سجل طلب المراجعة
    const { error: requestError } = await supabaseClient
      .from('google_review_requests')
      .insert({
        evaluation_id: evaluationId,
        customer_id: evaluation.customer_id,
        review_link: reviewLink,
        status: 'sent'
      })

    if (requestError) {
      console.error('Error creating review request record:', requestError)
    }

    // إنشاء رسالة واتساب
    if (evaluation.customers?.whatsapp) {
      const message = `${settings.review_template}\n\n${reviewLink}\n\nشكراً لك على تقييمك الإيجابي لخدماتنا!`

      const { error: messageError } = await supabaseClient
        .from('whatsapp_messages')
        .insert({
          from_number: 'system',
          to_number: evaluation.customers.whatsapp,
          message_type: 'text',
          message_content: message,
          status: 'pending',
          customer_id: evaluation.customer_id
        })

      if (messageError) {
        console.error('Error creating WhatsApp message:', messageError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Review request sent successfully',
        reviewLink 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in send-google-review-request function:', error)
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