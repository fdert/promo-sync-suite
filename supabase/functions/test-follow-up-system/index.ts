import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('🧪 Testing follow-up system...')
    
    // 1. Check follow-up settings
    const { data: settings, error: settingsError } = await supabase
      .from('follow_up_settings')
      .select('*')
      .single()
    
    if (settingsError) {
      console.error('❌ Error fetching follow-up settings:', settingsError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No follow-up settings found',
          details: settingsError 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }
    
    console.log('✅ Follow-up settings found:', settings)
    
    // 2. Test delivery delay check
    console.log('🔍 Testing delivery delay check...')
    try {
      const { error: deliveryError } = await supabase.rpc('check_delivery_delays')
      if (deliveryError) {
        console.error('❌ Delivery delay check failed:', deliveryError)
      } else {
        console.log('✅ Delivery delay check completed')
      }
    } catch (error) {
      console.error('❌ Delivery delay function error:', error)
    }
    
    // 3. Test payment delay check
    console.log('🔍 Testing payment delay check...')
    try {
      const { error: paymentError } = await supabase.rpc('check_payment_delays')
      if (paymentError) {
        console.error('❌ Payment delay check failed:', paymentError)
      } else {
        console.log('✅ Payment delay check completed')
      }
    } catch (error) {
      console.error('❌ Payment delay function error:', error)
    }
    
    // 4. Check pending WhatsApp messages
    const { data: pendingMessages, error: messagesError } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('status', 'pending')
    
    if (messagesError) {
      console.error('❌ Error fetching pending messages:', messagesError)
    } else {
      console.log(`📱 Found ${pendingMessages?.length || 0} pending WhatsApp messages`)
    }
    
    // 5. Check recent orders for follow-up opportunities
    const { data: recentOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, status, due_date, amount, paid_amount, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (ordersError) {
      console.error('❌ Error fetching recent orders:', ordersError)
    } else {
      console.log(`📋 Found ${recentOrders?.length || 0} recent orders`)
    }
    
    // 6. Test creating a sample follow-up message
    const testResult = await createTestFollowUpMessage(supabase, settings)
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        settings: !!settings,
        pendingMessages: pendingMessages?.length || 0,
        recentOrders: recentOrders?.length || 0,
        testMessage: testResult.success
      },
      data: {
        settings,
        pendingMessages: pendingMessages?.slice(0, 3), // Show first 3 only
        recentOrders: recentOrders?.slice(0, 3), // Show first 3 only
        testMessage: testResult.message
      }
    }
    
    console.log('✅ Follow-up system test completed:', response)
    
    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function createTestFollowUpMessage(supabase: any, settings: any) {
  if (!settings.follow_up_whatsapp) {
    return { success: false, message: 'No follow-up WhatsApp number configured' }
  }
  
  try {
    const testMessage = `🧪 اختبار نظام المتابعة
    
⏰ الوقت: ${new Date().toLocaleString('ar-SA')}
✅ النظام يعمل بشكل صحيح
📱 هذه رسالة اختبار تلقائية

الإعدادات النشطة:
${settings.send_whatsapp_on_new_order ? '✅' : '❌'} إشعار الطلبات الجديدة
${settings.send_whatsapp_on_delivery_delay ? '✅' : '❌'} إشعار تأخير التسليم
${settings.send_whatsapp_on_payment_delay ? '✅' : '❌'} إشعار تأخير المدفوعات
${settings.send_whatsapp_on_failure ? '✅' : '❌'} إشعار الأخطاء`
    
    const { error } = await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'test_system',
        to_number: settings.follow_up_whatsapp,
        message_type: 'test_notification',
        message_content: testMessage,
        status: 'pending'
      })
    
    if (error) {
      console.error('❌ Failed to create test message:', error)
      return { success: false, message: error.message }
    }
    
    console.log('✅ Test follow-up message created successfully')
    return { success: true, message: 'Test message created and queued for sending' }
    
  } catch (error) {
    console.error('❌ Error creating test message:', error)
    return { success: false, message: error.message }
  }
}