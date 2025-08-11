import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const handler = async (req: Request): Promise<Response> => {
  console.log('🚀 بدء معالجة طلب إرسال بيانات دخول الوكالة');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { agencyId, userEmail } = await req.json();
    console.log(`📧 إرسال بيانات دخول الوكالة: ${agencyId} للإيميل: ${userEmail}`);

    // جلب بيانات الوكالة
    const { data: agency, error: agencyError } = await supabaseClient
      .from('agencies')
      .select('name, contact_email, slug')
      .eq('id', agencyId)
      .single();

    if (agencyError || !agency) {
      console.error('❌ خطأ في جلب بيانات الوكالة:', agencyError);
      throw new Error('لم يتم العثور على بيانات الوكالة');
    }

    console.log('✅ تم جلب بيانات الوكالة:', agency.name);

    // إنشاء محتوى الإيميل
    const agencyUrl = `${new URL(req.url).origin}/admin/dashboard?agency=${agencyId}`;
    const loginUrl = `${new URL(req.url).origin}/agency-login`;

    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .info-box { background: #e3f2fd; border-right: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; color: #666; margin-top: 30px; padding: 20px; border-top: 1px solid #eee; }
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

            <div class="info-box">
              <h3>💡 نصائح مهمة</h3>
              <ul>
                <li>احتفظ ببيانات الدخول في مكان آمن</li>
                <li>يمكنك تخصيص إعدادات الوكالة من لوحة التحكم</li>
                <li>تواصل مع الدعم الفني في حالة وجود أي استفسارات</li>
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

    // إرسال الإيميل
    console.log('📤 إرسال الإيميل...');
    const emailResult = await resend.emails.send({
      from: 'منصة الوكالات <onboarding@resend.dev>',
      to: [userEmail],
      subject: `🎉 مرحباً بك! تم إنشاء وكالة "${agency.name}" بنجاح`,
      html: emailHtml,
    });

    console.log('✅ تم إرسال الإيميل بنجاح:', emailResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم إرسال بيانات الدخول بنجاح',
        emailId: emailResult.data?.id
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('❌ خطأ في إرسال بيانات الدخول:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'حدث خطأ في إرسال الإيميل'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);