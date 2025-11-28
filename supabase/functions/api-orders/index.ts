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
    const orderId = pathParts[pathParts.length - 1];
    
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    let response;
    let requestBody = null;

    if (req.method === 'GET') {
      if (orderId && orderId !== 'api-orders') {
        // GET /api-orders/:id - الحصول على طلب محدد
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            customers (id, name, phone, whatsapp, email),
            service_types (id, name, description),
            order_items (*),
            payments (*)
          `)
          .eq('id', orderId)
          .single();

        if (error) {
          response = new Response(
            JSON.stringify({ error: 'فشل في جلب الطلب', details: error.message }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          response = new Response(
            JSON.stringify({ success: true, data }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // GET /api-orders - الحصول على جميع الطلبات
        const status = url.searchParams.get('status');
        const customerId = url.searchParams.get('customer_id');
        const fromDate = url.searchParams.get('from_date');
        const toDate = url.searchParams.get('to_date');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        let query = supabase
          .from('orders')
          .select(`
            *,
            customers (id, name, phone, whatsapp),
            service_types (id, name),
            order_items (*),
            payments (*)
          `, { count: 'exact' });

        if (status) query = query.eq('status', status);
        if (customerId) query = query.eq('customer_id', customerId);
        if (fromDate) query = query.gte('created_at', fromDate);
        if (toDate) query = query.lte('created_at', toDate);

        query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
          response = new Response(
            JSON.stringify({ error: 'فشل في جلب الطلبات', details: error.message }),
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
      // POST /api-orders - إنشاء طلب جديد
      requestBody = await req.json();
      const { customer_id, service_type_id, total_amount, notes, items, status } = requestBody;

      // إنشاء الطلب
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id,
          service_type_id,
          total_amount,
          notes,
          status: status || 'pending',
          paid_amount: 0,
        })
        .select()
        .single();

      if (orderError) {
        response = new Response(
          JSON.stringify({ error: 'فشل في إنشاء الطلب', details: orderError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // إضافة بنود الطلب إن وجدت
        if (items && items.length > 0) {
          const orderItems = items.map((item: any) => ({
            order_id: order.id,
            item_name: item.item_name,
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            total: (item.quantity || 1) * (item.unit_price || 0),
            description: item.description,
          }));

          await supabase.from('order_items').insert(orderItems);
        }

        response = new Response(
          JSON.stringify({ success: true, data: order, message: 'تم إنشاء الطلب بنجاح' }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (req.method === 'PUT') {
      // PUT /api-orders/:id - تحديث طلب موجود
      requestBody = await req.json();
      const { status, notes, total_amount, delivery_date } = requestBody;

      const updateData: any = {};
      if (status) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      if (total_amount !== undefined) updateData.total_amount = total_amount;
      if (delivery_date !== undefined) updateData.delivery_date = delivery_date;

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        response = new Response(
          JSON.stringify({ error: 'فشل في تحديث الطلب', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        response = new Response(
          JSON.stringify({ success: true, data, message: 'تم تحديث الطلب بنجاح' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (req.method === 'DELETE') {
      // DELETE /api-orders/:id - حذف طلب
      const { error } = await supabase.rpc('delete_order_with_related_data', {
        order_id_param: orderId
      });

      if (error) {
        response = new Response(
          JSON.stringify({ error: 'فشل في حذف الطلب', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        response = new Response(
          JSON.stringify({ success: true, message: 'تم حذف الطلب بنجاح' }),
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
