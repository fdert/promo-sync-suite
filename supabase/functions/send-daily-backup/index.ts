import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BackupRequest {
  scheduled?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting database backup process...");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call the database function to generate backup
    console.log("Generating database backup...");
    const { data: backupData, error: backupError } = await supabase
      .rpc("generate_database_backup");

    if (backupError) {
      console.error("Error generating backup:", backupError);
      throw new Error(`Failed to generate backup: ${backupError.message}`);
    }

    if (!backupData) {
      throw new Error("No backup data generated");
    }

    console.log("Backup generated successfully, preparing email...");

    // Get current date for filename
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `database-backup-${currentDate}.sql`;

    // Create backup file as attachment
    const backupBuffer = new TextEncoder().encode(backupData);
    const backupBase64 = btoa(String.fromCharCode(...new Uint8Array(backupBuffer)));

    // Send email with backup attachment
    console.log("Sending backup email...");
    const emailResponse = await resend.emails.send({
      from: "نظام النسخ الاحتياطي <onboarding@resend.dev>",
      to: ["Fm0002009@gmail.com"],
      subject: `النسخة الاحتياطية اليومية - ${currentDate}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #2563eb;">النسخة الاحتياطية اليومية لقاعدة البيانات</h1>
          <p>تم إنشاء نسخة احتياطية من قاعدة البيانات بنجاح.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">تفاصيل النسخة الاحتياطية:</h3>
            <ul style="color: #4b5563;">
              <li><strong>التاريخ:</strong> ${new Date().toLocaleDateString('ar-SA')}</li>
              <li><strong>الوقت:</strong> ${new Date().toLocaleTimeString('ar-SA')}</li>
              <li><strong>اسم الملف:</strong> ${filename}</li>
              <li><strong>حجم الملف:</strong> ${(backupBuffer.length / 1024).toFixed(2)} KB</li>
            </ul>
          </div>
          
          <p style="color: #6b7280;">
            النسخة الاحتياطية مرفقة بهذا البريد الإلكتروني. يرجى حفظها في مكان آمن.
          </p>
          
          <div style="background-color: #fef3c7; border-right: 4px solid #f59e0b; padding: 12px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0;">
              <strong>ملاحظة هامة:</strong> احتفظ بهذه النسخة الاحتياطية في مكان آمن ولا تشاركها مع أي شخص غير مصرح له.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px;">
            هذا البريد تم إرساله تلقائياً من نظام النسخ الاحتياطي. للحصول على المساعدة، يرجى الاتصال بالدعم الفني.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: filename,
          content: backupBase64,
        },
      ],
    });

    if (emailResponse.error) {
      console.error("Error sending email:", emailResponse.error);
      throw new Error(`Failed to send email: ${emailResponse.error.message}`);
    }

    console.log("Backup email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "تم إرسال النسخة الاحتياطية بنجاح",
        emailId: emailResponse.data?.id,
        backupSize: backupBuffer.length,
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
    console.error("Error in send-daily-backup function:", error);
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
