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
    const customerId = pathParts[pathParts.length - 1];
    
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    let response;
    let requestBody = null;

    if (req.method === 'GET') {
      if (customerId && customerId !== 'api-customers') {
        // GET /api-customers/:id - الحصول على عميل محدد
        const { data, error } = await supabase
          .from('customers')
          .select(`
            *,
            orders (
              id,
              order_number,
              status,
              total_amount,
              paid_amount,
              created_at
            ),
            customer_loyalty_points (
              total_points,
              lifetime_points,
              redeemed_points
            )
          `)
          .eq('id', customerId)
          .single();

        if (error) {
          response = new Response(
            JSON.stringify({ error: 'فشل في جلب العميل', details: error.message }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          response = new Response(
            JSON.stringify({ success: true, data }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // GET /api-customers - الحصول على جميع العملاء
        const search = url.searchParams.get('search');
        const isActive = url.searchParams.get('is_active');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        let query = supabase
          .from('customers')
          .select('*', { count: 'exact' });

        if (search) {
          query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,whatsapp.ilike.%${search}%`);
        }
        if (isActive !== null) {
          query = query.eq('is_active', isActive === 'true');
        }

        query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
          response = new Response(
            JSON.stringify({ error: 'فشل في جلب العملاء', details: error.message }),
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
      // POST /api-customers - إنشاء عميل جديد
      requestBody = await req.json();
      const { name, phone, whatsapp, email, address, city, area, notes } = requestBody;

      const { data, error } = await supabase
        .from('customers')
        .insert({
          name,
          phone,
          whatsapp,
          email,
          address,
          city,
          area,
          notes,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        response = new Response(
          JSON.stringify({ error: 'فشل في إنشاء العميل', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        response = new Response(
          JSON.stringify({ success: true, data, message: 'تم إنشاء العميل بنجاح' }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (req.method === 'PUT') {
      // PUT /api-customers/:id - تحديث عميل موجود
      requestBody = await req.json();
      const { name, phone, whatsapp, email, address, city, area, notes, is_active } = requestBody;

      const updateData: any = {};
      if (name) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
      if (email !== undefined) updateData.email = email;
      if (address !== undefined) updateData.address = address;
      if (city !== undefined) updateData.city = city;
      if (area !== undefined) updateData.area = area;
      if (notes !== undefined) updateData.notes = notes;
      if (is_active !== undefined) updateData.is_active = is_active;

      const { data, error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', customerId)
        .select()
        .single();

      if (error) {
        response = new Response(
          JSON.stringify({ error: 'فشل في تحديث العميل', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        response = new Response(
          JSON.stringify({ success: true, data, message: 'تم تحديث العميل بنجاح' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (req.method === 'DELETE') {
      // DELETE /api-customers/:id - حذف عميل (تعطيل فقط)
      const { data, error } = await supabase
        .from('customers')
        .update({ is_active: false })
        .eq('id', customerId)
        .select()
        .single();

      if (error) {
        response = new Response(
          JSON.stringify({ error: 'فشل في حذف العميل', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        response = new Response(
          JSON.stringify({ success: true, data, message: 'تم تعطيل العميل بنجاح' }),
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
