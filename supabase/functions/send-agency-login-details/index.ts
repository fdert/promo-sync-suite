import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  console.log('🚀 Edge Function started');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📧 Processing agency login email request');

    // Initialize Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not found');
    }
    
    const resend = new Resend(resendApiKey);
    console.log('✅ Resend initialized');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not found');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized');

    // Parse request body
    const { agencyId, userEmail } = await req.json();
    console.log(`📨 Request data: agencyId=${agencyId}, userEmail=${userEmail}`);

    if (!agencyId || !userEmail) {
      throw new Error('Missing agencyId or userEmail');
    }

    // Fetch agency data
    const { data: agency, error: agencyError } = await supabaseClient
      .from('agencies')
      .select('name, contact_email, slug')
      .eq('id', agencyId)
      .single();

    if (agencyError) {
      console.error('❌ Agency fetch error:', agencyError);
      throw new Error(`Agency not found: ${agencyError.message}`);
    }

    if (!agency) {
      throw new Error('Agency data is null');
    }

    console.log('✅ Agency data fetched:', agency.name);

    // Create email content
    const agencyUrl = `${new URL(req.url).origin}/admin/dashboard?agency=${agencyId}`;
    const loginUrl = `${new URL(req.url).origin}/agency-login`;

    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            direction: rtl; 
            margin: 0; 
            padding: 20px; 
            background-color: #f5f5f5; 
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 10px; 
            overflow: hidden; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px; 
            text-align: center; 
          }
          .content { 
            padding: 30px; 
          }
          .button { 
            display: inline-block; 
            background: #007bff; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 10px 0; 
          }
          .info-box { 
            background: #e3f2fd; 
            border-right: 4px solid #2196f3; 
            padding: 15px; 
            margin: 20px 0; 
            border-radius: 5px; 
          }
          .footer { 
            text-align: center; 
            color: #666; 
            margin-top: 30px; 
            padding: 20px; 
            border-top: 1px solid #eee; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 مرحباً بك في منصة إدارة الوكالات</h1>
            <p>تم إنشاء وكالتك بنجاح وتفعيل الاشتراك!</p>
          </div>
          
          <div class="content">
            <h2>تفاصيل وكالتك الجديدة:</h2>
            
            <div class="info-box">
              <h3>📋 معلومات الوكالة</h3>
              <p><strong>اسم الوكالة:</strong> ${agency.name}</p>
              <p><strong>البريد الإلكتروني:</strong> ${agency.contact_email}</p>
              <p><strong>الرابط المخصص:</strong> ${agency.slug}</p>
            </div>

            <div class="info-box">
              <h3>🔑 بيانات الدخول</h3>
              <p><strong>رابط تسجيل الدخول:</strong></p>
              <a href="${loginUrl}" class="button">تسجيل الدخول للوكالة</a>
              
              <p><strong>أو ادخل مباشرة لوحة التحكم:</strong></p>
              <a href="${agencyUrl}" class="button">دخول لوحة التحكم</a>
            </div>

            <div class="info-box">
              <h3>📚 الخطوات التالية</h3>
              <ul>
                <li>قم بتسجيل الدخول باستخدام نفس الإيميل وكلمة المرور المستخدمة</li>
                <li>أكمل إعداد ملف الوكالة والإعدادات</li>
                <li>ابدأ بإضافة العملاء والخدمات</li>
                <li>قم بدعوة أعضاء فريقك للانضمام للوكالة</li>
              </ul>
            </div>
          </div>

          <div class="footer">
            <p>شكراً لك لاختيار منصتنا لإدارة وكالتك</p>
            <p>فريق الدعم الفني</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    console.log('📤 Sending email...');
    const emailResult = await resend.emails.send({
      from: 'منصة الوكالات <onboarding@resend.dev>',
      to: [userEmail],
      subject: `🎉 مرحباً بك! تم إنشاء وكالة "${agency.name}" بنجاح`,
      html: emailHtml,
    });

    console.log('✅ Email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم إرسال بيانات الدخول بنجاح',
        emailId: emailResult.data?.id,
        agency: agency.name
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('❌ Error in send-agency-login-details:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'حدث خطأ في إرسال الإيميل',
        details: error.stack
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});