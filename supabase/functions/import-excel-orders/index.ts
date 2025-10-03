import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const orders = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Importing ${orders.length} orders...`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const orderData of orders) {
      try {
        // Map Excel columns to database fields
        const order = {
          order_number: orderData['رقم الطلب'],
          total_amount: parseFloat(orderData['المبلغ الإجمالي'] || '0'),
          paid_amount: parseFloat(orderData['المبلغ المدفوع'] || '0'),
          discount: parseFloat(orderData['الخصم'] || '0'),
          tax: parseFloat(orderData['الضريبة'] || '0'),
          status: orderData['الحالة'] || 'pending',
          delivery_date: orderData['تاريخ التسليم'],
          notes: orderData['الملاحظات'],
        };

        // Find or create customer
        const customerName = orderData['اسم العميل'];
        let customerId = null;

        if (customerName) {
          const { data: existingCustomer } = await supabaseAdmin
            .from('customers')
            .select('id')
            .eq('name', customerName)
            .single();

          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            const { data: newCustomer, error: customerError } = await supabaseAdmin
              .from('customers')
              .insert({
                name: customerName,
                phone: orderData['رقم الهاتف'],
                whatsapp: orderData['الواتساب'],
                email: orderData['البريد الإلكتروني'],
                city: orderData['المدينة'],
                area: orderData['المنطقة'],
              })
              .select()
              .single();

            if (customerError) throw customerError;
            customerId = newCustomer.id;
          }
        }

        // Insert order
        const { error: orderError } = await supabaseAdmin
          .from('orders')
          .insert({
            ...order,
            customer_id: customerId,
          });

        if (orderError) throw orderError;
        successCount++;

      } catch (err) {
        console.error('Import error:', err);
        errorCount++;
        errors.push(`طلب ${orderData['رقم الطلب']}: ${err.message}`);
      }
    }

    console.log(`Import completed: ${successCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: errorCount === 0,
        message: errorCount === 0
          ? 'تم استيراد الطلبات بنجاح'
          : `تم استيراد ${successCount} طلب، ${errorCount} أخطاء`,
        successCount,
        errorCount,
        errors: errors.slice(0, 10),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error importing orders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
