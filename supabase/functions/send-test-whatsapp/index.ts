import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Test message request:', body);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // جلب webhook نشط للرسائل الصادرة
    const { data: webhook } = await supabase
      .from('webhook_settings')
      .select('*')
      .eq('webhook_type', 'outgoing')
      .eq('is_active', true)
      .single();
    
    if (!webhook) {
      throw new Error('لم يتم العثور على webhook نشط للرسائل الصادرة');
    }
    
    console.log('Sending to webhook:', webhook.webhook_url);
    
    // إرسال البيانات للويب هوك
    const webhookResponse = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'test_message',
        customerPhone: body.customer_phone || '+966535983261',
        customerName: body.customer_name || 'مستخدم تجريبي',
        message: body.message || `رسالة تجريبية للتأكد من عمل النظام - ${new Date().toLocaleString('ar-SA')}`,
        companyName: 'وكالة الإبداع للدعاية والإعلان',
        timestamp: new Date().toISOString()
      })
    });
    
    console.log('Webhook response status:', webhookResponse.status);
    const responseText = await webhookResponse.text();
    console.log('Webhook response body:', responseText);
    
    // تسجيل الرسالة في قاعدة البيانات
    await supabase
      .from('whatsapp_messages')
      .insert({
        from_number: 'system',
        to_number: body.customer_phone || '+966535983261',
        message_type: 'text',
        message_content: body.message || `رسالة تجريبية للتأكد من عمل النظام - ${new Date().toLocaleString('ar-SA')}`,
        status: webhookResponse.ok ? 'sent' : 'failed',
        is_reply: false
      });
    
    if (webhookResponse.ok) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'تم إرسال الرسالة التجريبية بنجاح',
          webhook_status: webhookResponse.status,
          response: responseText
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } else {
      throw new Error(`Webhook returned status ${webhookResponse.status}: ${responseText}`);
    }
    
  } catch (error) {
    console.error('Error sending test message:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.toString() 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});