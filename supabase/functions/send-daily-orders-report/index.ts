import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrdersReportRequest {
  scheduled?: boolean;
  testEmail?: boolean;
  to?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: OrdersReportRequest = {} as OrdersReportRequest;
    try {
      body = await req.json();
    } catch (_e) {
      // no body provided
    }
    const toRecipient = body.to || "ibdaa.adve@gmail.com";

    console.log("Starting orders report generation...", { testEmail: body.testEmail, to: toRecipient });

    if (body.testEmail) {
      console.log("Sending test email only...");
      const emailResponse = await resend.emails.send({
        from: "نظام تقارير الطلبات <onboarding@resend.dev>",
        to: [toRecipient],
        subject: `اختبار نظام تقارير الطلبات - ${new Date().toLocaleDateString('ar-SA')}`,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color:#2563eb;">هذه رسالة اختبار</h2>
            <p>تم إرسال رسالة اختبار من نظام تقارير الطلبات بنجاح.</p>
            <p style="color:#6b7280;">إذا وصلتك هذه الرسالة فإعدادات البريد تعمل بشكل صحيح.</p>
          </div>
        `,
      });

      if (emailResponse.error) {
        console.error("Error sending test email:", emailResponse.error);
        throw new Error(`Failed to send test email: ${emailResponse.error.message}`);
      }

      return new Response(
        JSON.stringify({ success: true, message: "تم إرسال رسالة الاختبار بنجاح", emailId: emailResponse.data?.id }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch orders data with related information
    console.log("Fetching orders data...");
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        customers(name, phone, whatsapp, email, city, area),
        service_types(name),
        order_items(item_name, quantity, unit_price, total),
        payments(amount, payment_type, payment_date)
      `)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
      throw new Error(`Failed to fetch orders: ${ordersError.message}`);
    }

    if (!orders || orders.length === 0) {
      throw new Error("No orders data found");
    }

    console.log(`Found ${orders.length} orders, generating Excel...`);

    // Generate CSV content (Excel compatible)
    let csvContent = "\uFEFF"; // UTF-8 BOM for Excel
    
    // Headers
    const headers = [
      "رقم الطلب",
      "اسم العميل",
      "رقم الهاتف",
      "الواتساب",
      "البريد الإلكتروني",
      "المدينة",
      "المنطقة",
      "نوع الخدمة",
      "الحالة",
      "المبلغ الإجمالي",
      "المبلغ المدفوع",
      "المبلغ المتبقي",
      "الخصم",
      "الضريبة",
      "تاريخ الإنشاء",
      "تاريخ التسليم",
      "البنود",
      "المدفوعات",
      "الملاحظات"
    ];
    
    csvContent += headers.join(",") + "\n";

    // Data rows
    orders.forEach((order: any) => {
      const customer = order.customers || {};
      const serviceType = order.service_types?.name || "غير محدد";
      
      // Format order items
      const items = order.order_items?.map((item: any) => 
        `${item.item_name} (${item.quantity} × ${item.unit_price} = ${item.total})`
      ).join(" | ") || "لا توجد بنود";
      
      // Format payments
      const payments = order.payments?.map((payment: any) => 
        `${payment.payment_type}: ${payment.amount} ر.س (${payment.payment_date})`
      ).join(" | ") || "لا توجد دفعات";
      
      const remainingAmount = (order.total_amount || 0) - (order.paid_amount || 0);
      
      const row = [
        order.order_number || "",
        customer.name || "",
        customer.phone || "",
        customer.whatsapp || "",
        customer.email || "",
        customer.city || "",
        customer.area || "",
        serviceType,
        order.status || "",
        order.total_amount || 0,
        order.paid_amount || 0,
        remainingAmount,
        order.discount || 0,
        order.tax || 0,
        order.created_at ? new Date(order.created_at).toLocaleDateString('ar-SA') : "",
        order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('ar-SA') : "",
        `"${items.replace(/"/g, '""')}"`,
        `"${payments.replace(/"/g, '""')}"`,
        `"${(order.notes || "").replace(/"/g, '""')}"`
      ];
      
      csvContent += row.join(",") + "\n";
    });

    console.log("Excel content generated successfully, preparing email...");

    // Get current date for filename
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `orders-report-${currentDate}.csv`;

    // Create attachment
    const csvBuffer = new TextEncoder().encode(csvContent);
    const csvBase64 = btoa(String.fromCharCode(...new Uint8Array(csvBuffer)));

    // Calculate statistics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
    const totalPaid = orders.reduce((sum: number, o: any) => sum + (o.paid_amount || 0), 0);
    const totalRemaining = totalRevenue - totalPaid;
    
    const statusCounts = orders.reduce((acc: any, o: any) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});

    // Send email with report attachment
    console.log("Sending report email...");
    const emailResponse = await resend.emails.send({
      from: "نظام تقارير الطلبات <onboarding@resend.dev>",
      to: [toRecipient],
      subject: `التقرير اليومي للطلبات - ${currentDate}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #2563eb;">التقرير اليومي لجميع الطلبات</h1>
          <p>تم إنشاء تقرير شامل لجميع الطلبات في النظام.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">إحصائيات التقرير:</h3>
            <ul style="color: #4b5563;">
              <li><strong>إجمالي الطلبات:</strong> ${totalOrders}</li>
              <li><strong>إجمالي الإيرادات:</strong> ${totalRevenue.toFixed(2)} ر.س</li>
              <li><strong>إجمالي المدفوع:</strong> ${totalPaid.toFixed(2)} ر.س</li>
              <li><strong>إجمالي المتبقي:</strong> ${totalRemaining.toFixed(2)} ر.س</li>
              <li><strong>التاريخ:</strong> ${new Date().toLocaleDateString('ar-SA')}</li>
              <li><strong>الوقت:</strong> ${new Date().toLocaleTimeString('ar-SA')}</li>
            </ul>
            
            <h4 style="color: #1f2937; margin-top: 15px;">توزيع الطلبات حسب الحالة:</h4>
            <ul style="color: #4b5563;">
              ${Object.entries(statusCounts).map(([status, count]) => 
                `<li><strong>${status}:</strong> ${count}</li>`
              ).join('')}
            </ul>
          </div>
          
          <p style="color: #6b7280;">
            التقرير مرفق بهذا البريد الإلكتروني بصيغة Excel. يمكنك فتحه مباشرة في Microsoft Excel أو Google Sheets.
          </p>
          
          <div style="background-color: #fef3c7; border-right: 4px solid #f59e0b; padding: 12px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0;">
              <strong>ملاحظة هامة:</strong> احتفظ بهذا التقرير في مكان آمن ولا تشاركه مع أي شخص غير مصرح له.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px;">
            هذا البريد تم إرساله تلقائياً من نظام تقارير الطلبات. للحصول على المساعدة، يرجى الاتصال بالدعم الفني.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: filename,
          content: csvBase64,
        },
      ],
    });

    if (emailResponse.error) {
      console.error("Error sending email:", emailResponse.error);
      throw new Error(`Failed to send email: ${emailResponse.error.message}`);
    }

    console.log("Report email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "تم إرسال تقرير الطلبات بنجاح",
        emailId: emailResponse.data?.id,
        ordersCount: totalOrders,
        reportSize: csvBuffer.length,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-daily-orders-report function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
