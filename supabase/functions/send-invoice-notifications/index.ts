import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();
    console.log('Invoice notification request:', { type, data });

    // Fetch customer data if invoice_id is provided
    let customerData = null;
    if (data.customer_id) {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('name, phone, whatsapp_number')
        .eq('id', data.customer_id)
        .single();

      if (customerError) {
        console.error('Error fetching customer:', customerError);
      } else {
        customerData = customer;
        console.log('Customer data:', customerData);
      }
    }

    if (!customerData?.whatsapp_number) {
      console.log('No WhatsApp number found for customer');
      return new Response(
        JSON.stringify({ success: false, message: 'No WhatsApp number found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Get notification type mapping
    const notificationMap: Record<string, string> = {
      'invoice_created': 'إنشاء فاتورة جديدة',
      'invoice_paid': 'دفع فاتورة',
      'invoice_overdue': 'تأخير في الدفع',
      'invoice_updated': 'تحديث فاتورة'
    };

    // Generate message based on notification type
    let message = '';
    switch (type) {
      case 'invoice_created':
        message = `${customerData.name}، تم إنشاء فاتورة جديدة رقم ${data.invoice_number} بقيمة ${data.amount} ريال. تاريخ الاستحقاق: ${data.due_date}`;
        break;
      case 'invoice_paid':
        message = `${customerData.name}، شكراً لك! تم تسجيل دفع الفاتورة رقم ${data.invoice_number} بقيمة ${data.amount} ريال بنجاح.`;
        break;
      case 'invoice_overdue':
        message = `${customerData.name}، تنبيه: الفاتورة رقم ${data.invoice_number} بقيمة ${data.amount} ريال متأخرة عن موعد الاستحقاق. يرجى المراجعة.`;
        break;
      default:
        message = `${customerData.name}، تم تحديث الفاتورة رقم ${data.invoice_number}.`;
    }

    console.log('Generated message:', message);

    // Get active webhook settings for invoices
    const { data: webhookSettings, error: webhookError } = await supabase
      .from('webhook_settings')
      .select('webhook_url')
      .eq('webhook_type', 'invoice')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    // إذا لم نجد webhook خاص بالفواتير، استخدم الـ webhook العام
    let webhookUrl = webhookSettings?.webhook_url;
    if (!webhookUrl) {
      const { data: generalWebhook } = await supabase
        .from('webhook_settings')
        .select('webhook_url')
        .eq('webhook_type', 'outgoing')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      webhookUrl = generalWebhook?.webhook_url;
    }

    if (webhookError) {
      console.error('Error fetching webhook settings:', webhookError);
      throw new Error('Failed to fetch webhook settings');
    }

    if (!webhookUrl) {
      console.log('No active webhook configured for invoices');
      return new Response(
        JSON.stringify({ success: false, message: 'No active webhook configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Prepare webhook payload
    const webhookPayload = {
      to: customerData.whatsapp_number,
      type: 'text',
      message: {
        text: message
      },
      timestamp: Math.floor(Date.now() / 1000),
      notification_type: type,
      customer_name: customerData.name,
      invoice_data: data
    };

    console.log('Sending notification via webhook:', JSON.stringify(webhookPayload, null, 2));

    // Send to webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });

    const responseText = await webhookResponse.text();
    console.log('Webhook response:', responseText);

    if (!webhookResponse.ok) {
      console.error('Webhook failed:', webhookResponse.status, responseText);
      throw new Error(`Webhook failed: ${webhookResponse.status} ${responseText}`);
    }

    // Log the sent message to the database
    try {
      const { error: logError } = await supabase
        .from('whatsapp_messages')
        .insert({
          from_number: 'system',
          to_number: customerData.whatsapp_number,
          message_content: message,
          message_type: 'text',
          status: 'sent',
          customer_id: data.customer_id,
          timestamp: new Date().toISOString()
        });

      if (logError) {
        console.error('Error logging message:', logError);
      }
    } catch (logError) {
      console.error('Error logging message:', logError);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Invoice notification sent successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Invoice notification error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send invoice notification',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});