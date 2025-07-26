import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// إنشاء عميل Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      headers: corsHeaders,
      status: 405
    });
  }

  try {
    const body = await req.json();
    console.log('Received invoice notification request:', body);

    const { type, invoice_id, customer_id, invoice_data } = body;

    // جلب بيانات الفاتورة والعميل
    let invoice = null;
    let customer = null;

    if (invoice_id) {
      // جلب الفاتورة مع بيانات العميل
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          customers(name, phone, whatsapp_number)
        `)
        .eq('id', invoice_id)
        .single();

      if (invoiceError) {
        console.error('Error fetching invoice:', invoiceError);
        return new Response(
          JSON.stringify({ error: 'Invoice not found' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404
          }
        );
      }

      invoice = invoiceData;
      customer = invoiceData.customers;
    } else if (customer_id) {
      // جلب بيانات العميل فقط
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('name, phone, whatsapp_number')
        .eq('id', customer_id)
        .single();

      if (customerError) {
        console.error('Error fetching customer:', customerError);
        return new Response(
          JSON.stringify({ error: 'Customer not found' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404
          }
        );
      }

      customer = customerData;
    }

    if (!customer) {
      return new Response(
        JSON.stringify({ error: 'No customer data found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // التحقق من وجود رقم واتس آب للعميل
    const customerPhone = customer.whatsapp_number || customer.phone;
    if (!customerPhone) {
      console.log('No WhatsApp number available for customer');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No WhatsApp number available for customer' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // محاولة الحصول على قالب الرسالة من قاعدة البيانات
    const { data: templateData } = await supabase
      .from('message_templates')
      .select('template_content')
      .eq('template_name', type)
      .eq('is_active', true)
      .maybeSingle();

    let message = '';
    
    if (templateData?.template_content) {
      // استخدام القالب من قاعدة البيانات
      message = templateData.template_content;
      
      // استبدال المتغيرات
      const replacements: Record<string, string> = {
        'customer_name': customer.name || 'عميلنا الكريم',
        'invoice_number': invoice?.invoice_number || invoice_data?.invoice_number || '',
        'amount': invoice?.total_amount?.toString() || invoice_data?.amount?.toString() || '',
        'due_date': invoice?.due_date || invoice_data?.due_date || '',
        'payment_date': invoice?.payment_date || invoice_data?.payment_date || '',
        'status': invoice?.status || invoice_data?.status || '',
        'invoice_link': `https://gcuqfxacnbxdldsbmgvf.supabase.co/preview/invoice/${invoice?.id || invoice_data?.invoice_id}`
      };

      // استبدال جميع المتغيرات في الرسالة
      Object.keys(replacements).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        message = message.replace(regex, replacements[key]);
      });
    } else {
      // الرسائل الافتراضية إذا لم توجد قوالب
      switch (type) {
        case 'invoice_created':
          message = `🧾 *فاتورة جديدة*

مرحباً ${customer.name || 'عزيزنا العميل'}،

تم إصدار فاتورة جديدة لكم بالتفاصيل التالية:

📄 *رقم الفاتورة:* ${invoice?.invoice_number || invoice_data?.invoice_number}
💰 *المبلغ الإجمالي:* ${invoice?.total_amount || invoice_data?.amount} ر.س
📅 *تاريخ الاستحقاق:* ${invoice?.due_date ? new Date(invoice.due_date).toLocaleDateString('ar-SA') : invoice_data?.due_date}
💳 *طريقة الدفع:* ${invoice?.payment_method || invoice_data?.payment_method || 'غير محددة'}

${invoice?.notes || invoice_data?.notes ? `📝 *ملاحظات:* ${invoice?.notes || invoice_data?.notes}` : ''}

🔗 *رابط الفاتورة:*
https://gcuqfxacnbxdldsbmgvf.supabase.co/preview/invoice/${invoice?.id || invoice_data?.invoice_id}

نشكركم على ثقتكم بنا ونتطلع لخدمتكم دائماً.

للاستفسارات، يرجى التواصل معنا.`;
          break;
        case 'invoice_paid':
          message = `✅ *تأكيد الدفع*

شكراً لك ${customer.name}! 

تم تسجيل دفع الفاتورة رقم ${invoice?.invoice_number || invoice_data?.invoice_number} بقيمة ${invoice?.total_amount || invoice_data?.amount} ر.س بنجاح.

تاريخ الدفع: ${invoice?.payment_date ? new Date(invoice.payment_date).toLocaleDateString('ar-SA') : new Date().toLocaleDateString('ar-SA')}

🔗 *رابط الفاتورة:*
https://gcuqfxacnbxdldsbmgvf.supabase.co/preview/invoice/${invoice?.id || invoice_data?.invoice_id}

نشكركم على سرعة الدفع وحسن التعامل.`;
          break;
        case 'invoice_overdue':
          message = `⚠️ *تذكير بالدفع*

${customer.name}، 

نود تذكيركم بأن الفاتورة رقم ${invoice?.invoice_number || invoice_data?.invoice_number} بقيمة ${invoice?.total_amount || invoice_data?.amount} ر.س متأخرة عن موعد الاستحقاق.

تاريخ الاستحقاق: ${invoice?.due_date ? new Date(invoice.due_date).toLocaleDateString('ar-SA') : invoice_data?.due_date}

🔗 *رابط الفاتورة:*
https://gcuqfxacnbxdldsbmgvf.supabase.co/preview/invoice/${invoice?.id || invoice_data?.invoice_id}

نرجو منكم المراجعة والدفع في أقرب وقت ممكن.

للاستفسارات، يرجى التواصل معنا.`;
          break;
        default:
          message = `${customer.name}، تم تحديث الفاتورة رقم ${invoice?.invoice_number || invoice_data?.invoice_number}.

🔗 *رابط الفاتورة:*
https://gcuqfxacnbxdldsbmgvf.supabase.co/preview/invoice/${invoice?.id || invoice_data?.invoice_id}`;
      }
    }

    console.log('Generated message:', message);

    // الحصول على إعدادات الويب هوك للإرسال
    const { data: webhookSettings } = await supabase
      .from('webhook_settings')
      .select('webhook_url')
      .eq('webhook_type', 'outgoing')
      .eq('is_active', true)
      .maybeSingle();

    if (!webhookSettings?.webhook_url) {
      console.log('No outgoing webhook configured');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No outgoing webhook configured' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // إعداد بيانات الرسالة للإرسال عبر webhook
    const messagePayload = {
      to: customerPhone,
      type: 'text',
      message: {
        text: message
      },
      timestamp: Math.floor(Date.now() / 1000),
      notification_type: type,
      customer_name: customer.name
    };

    console.log('Sending invoice message:', JSON.stringify(messagePayload, null, 2));

    // إرسال الرسالة عبر webhook
    const response = await fetch(webhookSettings.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload)
    });

    const responseData = await response.text();
    console.log('Webhook response:', responseData);

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${responseData}`);
    }

    // حفظ الرسالة المرسلة في قاعدة البيانات
    try {
      const { data: sentMessage, error: messageError } = await supabase
        .from('whatsapp_messages')
        .insert({
          from_number: 'system',
          to_number: customerPhone,
          message_type: 'text',
          message_content: message,
          status: 'sent',
          is_reply: true,
          customer_id: customer_id || invoice?.customer_id,
          replied_at: new Date().toISOString()
        })
        .select()
        .single();

      if (messageError) {
        console.error('Error saving sent message:', messageError);
      }

      // تحديث الفاتورة بتاريخ إرسال الواتس آب (إذا كانت موجودة)
      if (invoice_id && type === 'invoice_created') {
        await supabase
          .from('invoices')
          .update({ whatsapp_sent_at: new Date().toISOString() })
          .eq('id', invoice_id);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Invoice notification sent successfully',
          invoice_number: invoice?.invoice_number || invoice_data?.invoice_number,
          customer_phone: customerPhone,
          message_id: sentMessage?.id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );

    } catch (dbError) {
      console.error('Database error:', dbError);
      // حتى لو فشل حفظ الرسالة، نعتبر الإرسال نجح
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Invoice notification sent successfully (with database warning)',
          warning: 'Message not saved to database'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

  } catch (error) {
    console.error('Send invoice notification error:', error);
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