import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface ValidationResult {
  is_valid: boolean;
  api_key_id: string;
  permissions: any[];
}

async function validateApiKey(supabase: any, apiKey: string): Promise<ValidationResult | null> {
  const { data, error } = await supabase.rpc('validate_api_key', { key: apiKey });
  
  if (error || !data || data.length === 0) {
    return null;
  }
  
  return data[0];
}

async function logApiRequest(
  supabase: any, 
  apiKeyId: string, 
  endpoint: string, 
  method: string, 
  requestBody: any, 
  responseStatus: number,
  responseTime: number,
  ipAddress: string
) {
  await supabase.from('api_logs').insert({
    api_key_id: apiKeyId,
    endpoint,
    method,
    request_body: requestBody,
    response_status: responseStatus,
    response_time_ms: responseTime,
    ip_address: ipAddress,
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // التحقق من API key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key مفقود', message: 'يجب إرسال x-api-key في headers' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validation = await validateApiKey(supabase, apiKey);
    if (!validation || !validation.is_valid) {
      return new Response(
        JSON.stringify({ error: 'API key غير صالح أو منتهي الصلاحية' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(p => p);
    const paymentId = pathParts[pathParts.length - 1];
    
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    let response;
    let requestBody = null;

    if (req.method === 'GET') {
      if (paymentId && paymentId !== 'api-payments') {
        // GET /api-payments/:id - الحصول على دفعة محددة
        const { data, error } = await supabase
          .from('payments')
          .select(`
            *,
            customers (id, name, phone),
            orders (id, order_number, total_amount)
          `)
          .eq('id', paymentId)
          .single();

        if (error) {
          response = new Response(
            JSON.stringify({ error: 'فشل في جلب الدفعة', details: error.message }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          response = new Response(
            JSON.stringify({ success: true, data }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // GET /api-payments - الحصول على جميع الدفعات
        const customerId = url.searchParams.get('customer_id');
        const orderId = url.searchParams.get('order_id');
        const paymentType = url.searchParams.get('payment_type');
        const fromDate = url.searchParams.get('from_date');
        const toDate = url.searchParams.get('to_date');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        let query = supabase
          .from('payments')
          .select(`
            *,
            customers (id, name, phone),
            orders (id, order_number, total_amount)
          `, { count: 'exact' });

        if (customerId) query = query.eq('customer_id', customerId);
        if (orderId) query = query.eq('order_id', orderId);
        if (paymentType) query = query.eq('payment_type', paymentType);
        if (fromDate) query = query.gte('payment_date', fromDate);
        if (toDate) query = query.lte('payment_date', toDate);

        query = query.order('payment_date', { ascending: false }).range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
          response = new Response(
            JSON.stringify({ error: 'فشل في جلب الدفعات', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          response = new Response(
            JSON.stringify({ success: true, data, total: count, limit, offset }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } else if (req.method === 'POST') {
      // POST /api-payments - إنشاء دفعة جديدة
      requestBody = await req.json();
      const { customer_id, order_id, amount, payment_type, payment_date, reference_number, notes } = requestBody;

      if (!customer_id || !amount) {
        response = new Response(
          JSON.stringify({ error: 'customer_id و amount مطلوبان' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const { data, error } = await supabase
          .from('payments')
          .insert({
            customer_id,
            order_id,
            amount,
            payment_type: payment_type || 'cash',
            payment_date: payment_date || new Date().toISOString().split('T')[0],
            reference_number,
            notes,
          })
          .select()
          .single();

        if (error) {
          response = new Response(
            JSON.stringify({ error: 'فشل في إنشاء الدفعة', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          response = new Response(
            JSON.stringify({ success: true, data, message: 'تم إنشاء الدفعة بنجاح' }),
            { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } else if (req.method === 'PUT') {
      // PUT /api-payments/:id - تحديث دفعة موجودة
      requestBody = await req.json();
      const { amount, payment_type, payment_date, reference_number, notes } = requestBody;

      const updateData: any = {};
      if (amount !== undefined) updateData.amount = amount;
      if (payment_type) updateData.payment_type = payment_type;
      if (payment_date) updateData.payment_date = payment_date;
      if (reference_number !== undefined) updateData.reference_number = reference_number;
      if (notes !== undefined) updateData.notes = notes;

      const { data, error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId)
        .select()
        .single();

      if (error) {
        response = new Response(
          JSON.stringify({ error: 'فشل في تحديث الدفعة', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        response = new Response(
          JSON.stringify({ success: true, data, message: 'تم تحديث الدفعة بنجاح' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (req.method === 'DELETE') {
      // DELETE /api-payments/:id - حذف دفعة
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) {
        response = new Response(
          JSON.stringify({ error: 'فشل في حذف الدفعة', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        response = new Response(
          JSON.stringify({ success: true, message: 'تم حذف الدفعة بنجاح' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      response = new Response(
        JSON.stringify({ error: 'طريقة غير مدعومة' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseTime = Date.now() - startTime;
    await logApiRequest(
      supabase,
      validation.api_key_id,
      url.pathname,
      req.method,
      requestBody,
      response.status,
      responseTime,
      ipAddress
    );

    return response;
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ في الخادم', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
