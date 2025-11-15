import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'
import { renderTemplate } from '../_shared/template-utils.ts'

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
    
    console.log('🧪 بدء اختبار نظام المتابعة...')
    
    // 1. فحص إعدادات المتابعة
    const { data: settings, error: settingsError } = await supabase
      .from('follow_up_settings')
      .select('*')
      .maybeSingle()
    
    if (settingsError) {
      console.error('❌ خطأ في جلب إعدادات المتابعة:', settingsError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'خطأ في جلب إعدادات المتابعة',
          details: settingsError.message 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }
    
    if (!settings) {
      console.warn('⚠️ لم يتم العثور على إعدادات المتابعة')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'لم يتم العثور على إعدادات المتابعة. يرجى حفظ الإعدادات أولاً من صفحة إعدادات المتابعة'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      )
    }
    
    console.log('✅ تم العثور على إعدادات المتابعة:', settings)
    
    // 2. اختبار فحص تأخير التسليم
    console.log('🔍 اختبار فحص تأخير التسليم...')
    let deliveryTestResult = 'نجح'
    try {
      const { error: deliveryError } = await supabase.rpc('check_delivery_delays')
      if (deliveryError) {
        console.error('❌ فشل فحص تأخير التسليم:', deliveryError)
        deliveryTestResult = 'فشل: ' + deliveryError.message
      } else {
        console.log('✅ نجح فحص تأخير التسليم')
      }
    } catch (error) {
      console.error('❌ خطأ في دالة فحص تأخير التسليم:', error)
      deliveryTestResult = 'خطأ: ' + error.message
    }
    
    // 3. اختبار فحص تأخير الدفع
    console.log('🔍 اختبار فحص تأخير الدفع...')
    let paymentTestResult = 'نجح'
    try {
      const { error: paymentError } = await supabase.rpc('check_payment_delays')
      if (paymentError) {
        console.error('❌ فشل فحص تأخير الدفع:', paymentError)
        paymentTestResult = 'فشل: ' + paymentError.message
      } else {
        console.log('✅ نجح فحص تأخير الدفع')
      }
    } catch (error) {
      console.error('❌ خطأ في دالة فحص تأخير الدفع:', error)
      paymentTestResult = 'خطأ: ' + error.message
    }
    
    // 4. فحص الرسائل المعلقة
    const { data: pendingMessages, error: messagesError } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (messagesError) {
      console.error('❌ خطأ في جلب الرسائل المعلقة:', messagesError)
    } else {
      console.log(`📱 تم العثور على ${pendingMessages?.length || 0} رسالة معلقة`)
    }
    
    // 5. فحص الطلبات الحديثة
    const { data: recentOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, status, due_date, amount, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (ordersError) {
      console.error('❌ خطأ في جلب الطلبات الحديثة:', ordersError)
    } else {
      console.log(`📋 تم العثور على ${recentOrders?.length || 0} طلب حديث`)
    }
    
    // 6. إنشاء رسالة اختبار
    const testResult = await createTestFollowUpMessage(supabase, settings)
    
    // 7. فحص إعدادات الواتساب API
    const whatsappToken = Deno.env.get('WHATSAPP_TOKEN')
    const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
    const whatsappConfigured = !!(whatsappToken && whatsappPhoneId)
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        settingsFound: !!settings,
        whatsappNumber: settings?.follow_up_whatsapp,
        deliveryDelayFunction: deliveryTestResult,
        paymentDelayFunction: paymentTestResult,
        pendingMessages: pendingMessages?.length || 0,
        recentOrders: recentOrders?.length || 0,
        testMessageCreated: testResult.success,
        whatsappApiConfigured: whatsappConfigured
      },
      summary: `تم اختبار النظام بنجاح!
      
📊 النتائج:
✅ إعدادات المتابعة: موجودة
📱 رقم الواتساب: ${settings?.follow_up_whatsapp || 'غير محدد'}
🔍 دالة فحص التسليم: ${deliveryTestResult}
💰 دالة فحص الدفع: ${paymentTestResult}
📝 الرسائل المعلقة: ${pendingMessages?.length || 0}
📋 الطلبات الحديثة: ${recentOrders?.length || 0}
🧪 رسالة الاختبار: ${testResult.success ? 'تم إنشاؤها' : 'فشلت'}
🔑 إعدادات واتساب API: ${whatsappConfigured ? 'مُعرّفة' : 'غير مُعرّفة'}`
    }
    
    console.log('✅ اكتمل اختبار نظام المتابعة:', response)
    
    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
    
  } catch (error) {
    console.error('❌ فشل الاختبار:', error)
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
    return { success: false, message: 'رقم واتساب المتابعة غير مُعرّف' }
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
${settings.send_whatsapp_on_failure ? '✅' : '❌'} إشعار الأخطاء

🔄 ستتم معالجة هذه الرسالة تلقائياً بواسطة نظام الواتساب`
    
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
      console.error('❌ فشل في إنشاء رسالة الاختبار:', error)
      return { success: false, message: error.message }
    }
    
    console.log('✅ تم إنشاء رسالة اختبار المتابعة بنجاح')
    return { success: true, message: 'تم إنشاء رسالة الاختبار وإضافتها لقائمة الإرسال' }
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء رسالة الاختبار:', error)
    return { success: false, message: error.message }
  }
}