import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url, webhook_type } = await req.json()

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'Webhook URL is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // إنشاء بيانات اختبار مناسبة حسب نوع الويب هوك
    let testData = {}
    
    switch (webhook_type) {
      case 'outgoing':
        testData = {
          event: 'order_test',
          timestamp: new Date().toISOString(),
          data: {
            test: true,
            order_id: 'test-order-123',
            customer_name: 'عميل تجريبي',
            customer_phone: '+966500000000',
            status: 'pending',
            service_type: 'طباعة عادية',
            total_amount: 100,
            notes: 'هذا طلب تجريبي لاختبار الويب هوك',
            created_at: new Date().toISOString()
          }
        }
        break
      
      case 'whatsapp':
        testData = {
          event: 'whatsapp_test',
          timestamp: new Date().toISOString(),
          data: {
            test: true,
            message_id: 'test-msg-123',
            from: '+966500000000',
            to: '+966500000001',
            message: 'رسالة تجريبية لاختبار الويب هوك',
            type: 'text',
            status: 'sent'
          }
        }
        break
      
      case 'invoice':
        testData = {
          event: 'invoice_test',
          timestamp: new Date().toISOString(),
          data: {
            test: true,
            invoice_id: 'test-invoice-123',
            order_id: 'test-order-123',
            customer_name: 'عميل تجريبي',
            amount: 100,
            status: 'generated',
            created_at: new Date().toISOString()
          }
        }
        break
      
      case 'proof':
        testData = {
          event: 'proof_test',
          timestamp: new Date().toISOString(),
          data: {
            test: true,
            file_id: 'test-file-123',
            order_id: 'test-order-123',
            customer_name: 'عميل تجريبي',
            file_name: 'design_proof_test.jpg',
            file_url: 'https://example.com/proof.jpg',
            file_type: 'design',
            sent_to_customer: true,
            message: 'تم إرسال بروفة التصميم للعميل - هذا اختبار'
          }
        }
        break
      
      default:
        testData = {
          event: 'test',
          timestamp: new Date().toISOString(),
          data: {
            test: true,
            message: 'هذا اختبار عام للويب هوك'
          }
        }
    }

    console.log('Testing webhook:', url, 'Type:', webhook_type)
    console.log('Test data:', testData)

    // إرسال الطلب للويب هوك
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PrintShop-Webhook-Test/1.0'
      },
      body: JSON.stringify(testData)
    })

    const responseText = await response.text()
    
    const result = {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      response: responseText,
      url: url,
      webhook_type: webhook_type,
      timestamp: new Date().toISOString()
    }

    console.log('Webhook test result:', result)

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error testing webhook:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})