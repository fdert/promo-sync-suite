import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'طريقة غير مدعومة', message: 'هذا الـ endpoint يدعم GET فقط' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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
    const reportType = url.searchParams.get('type');
    const fromDate = url.searchParams.get('from_date');
    const toDate = url.searchParams.get('to_date');
    
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    let response;

    if (reportType === 'orders_summary') {
      // تقرير ملخص الطلبات
      let query = supabase
        .from('orders')
        .select('status, total_amount, paid_amount, created_at');

      if (fromDate) query = query.gte('created_at', fromDate);
      if (toDate) query = query.lte('created_at', toDate);

      const { data: orders, error } = await query;

      if (error) {
        response = new Response(
          JSON.stringify({ error: 'فشل في جلب تقرير الطلبات', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const summary = {
          total_orders: orders?.length || 0,
          total_amount: orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0,
          total_paid: orders?.reduce((sum, o) => sum + (o.paid_amount || 0), 0) || 0,
          by_status: orders?.reduce((acc: any, o) => {
            acc[o.status] = (acc[o.status] || 0) + 1;
            return acc;
          }, {}) || {},
        };

        response = new Response(
          JSON.stringify({ success: true, data: summary }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (reportType === 'payments_summary') {
      // تقرير ملخص المدفوعات
      let query = supabase
        .from('payments')
        .select('amount, payment_type, payment_date');

      if (fromDate) query = query.gte('payment_date', fromDate);
      if (toDate) query = query.lte('payment_date', toDate);

      const { data: payments, error } = await query;

      if (error) {
        response = new Response(
          JSON.stringify({ error: 'فشل في جلب تقرير المدفوعات', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const summary = {
          total_payments: payments?.length || 0,
          total_amount: payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
          by_type: payments?.reduce((acc: any, p) => {
            acc[p.payment_type] = {
              count: (acc[p.payment_type]?.count || 0) + 1,
              amount: (acc[p.payment_type]?.amount || 0) + (p.amount || 0),
            };
            return acc;
          }, {}) || {},
        };

        response = new Response(
          JSON.stringify({ success: true, data: summary }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (reportType === 'customers_balance') {
      // تقرير أرصدة العملاء
      const { data: balances, error } = await supabase
        .from('customer_order_balances')
        .select('*')
        .gt('balance', 0)
        .order('balance', { ascending: false });

      if (error) {
        response = new Response(
          JSON.stringify({ error: 'فشل في جلب تقرير الأرصدة', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        response = new Response(
          JSON.stringify({ success: true, data: balances }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (reportType === 'daily_summary') {
      // تقرير الملخص اليومي
      const today = new Date().toISOString().split('T')[0];

      const [ordersResult, paymentsResult, expensesResult] = await Promise.all([
        supabase
          .from('orders')
          .select('status, total_amount, paid_amount')
          .gte('created_at', today),
        supabase
          .from('payments')
          .select('amount, payment_type')
          .gte('payment_date', today),
        supabase
          .from('expenses')
          .select('amount, expense_type')
          .gte('expense_date', today),
      ]);

      const summary = {
        date: today,
        orders: {
          count: ordersResult.data?.length || 0,
          total_amount: ordersResult.data?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0,
          by_status: ordersResult.data?.reduce((acc: any, o) => {
            acc[o.status] = (acc[o.status] || 0) + 1;
            return acc;
          }, {}) || {},
        },
        payments: {
          count: paymentsResult.data?.length || 0,
          total_amount: paymentsResult.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
        },
        expenses: {
          count: expensesResult.data?.length || 0,
          total_amount: expensesResult.data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
        },
        net_income: (paymentsResult.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0) - 
                    (expensesResult.data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0),
      };

      response = new Response(
        JSON.stringify({ success: true, data: summary }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      response = new Response(
        JSON.stringify({ 
          error: 'نوع التقرير غير صالح', 
          message: 'الأنواع المدعومة: orders_summary, payments_summary, customers_balance, daily_summary' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseTime = Date.now() - startTime;
    await logApiRequest(
      supabase,
      validation.api_key_id,
      url.pathname,
      req.method,
      null,
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
