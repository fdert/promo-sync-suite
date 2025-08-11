import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 اختبار إرسال بريد إلكتروني...");
    
    const { to } = await req.json();
    
    if (!to) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "البريد الإلكتروني مطلوب" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("📧 إرسال إلى:", to);

    const emailResponse = await resend.emails.send({
      from: "نظام الوكالات <onboarding@resend.dev>",
      to: [to],
      subject: "🧪 اختبار إرسال البريد الإلكتروني",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl; text-align: right;">
          <div style="background: #4f46e5; padding: 20px; text-align: center; color: white;">
            <h1>✅ اختبار ناجح</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #e5e7eb;">
            <p>هذا اختبار لوظيفة إرسال البريد الإلكتروني.</p>
            <p>إذا وصلت هذه الرسالة، فإن النظام يعمل بشكل صحيح.</p>
            <p style="color: #666; font-size: 14px;">تاريخ الإرسال: ${new Date().toLocaleString('ar-SA')}</p>
          </div>
        </div>
      `,
    });

    console.log("✅ تم إرسال البريد بنجاح:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      messageId: emailResponse.data?.id,
      message: "تم إرسال البريد الإلكتروني بنجاح"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("❌ خطأ في إرسال البريد:", error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || "فشل في إرسال البريد الإلكتروني",
      details: error
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);