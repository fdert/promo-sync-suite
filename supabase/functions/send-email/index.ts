import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  type: 'welcome' | 'password_reset' | 'login_details' | 'agency_login_details';
  data?: {
    fullName?: string;
    tempPassword?: string;
    resetLink?: string;
    loginUrl?: string;
    agencyId?: string;
    agencyName?: string;
    userEmail?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, type, data }: EmailRequest = await req.json();

    let htmlContent = '';

    switch (type) {
      case 'welcome':
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl; text-align: right;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">مرحباً بك في نظام إدارة الوكالات</h1>
            </div>
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
              <h2 style="color: #374151; margin-bottom: 20px;">أهلاً وسهلاً ${data?.fullName || 'عزيزنا العميل'}</h2>
              <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
                نحن سعداء جداً بانضمامك إلى نظام إدارة الوكالات. يمكنك الآن الاستفادة من جميع المميزات المتاحة في النظام.
              </p>
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #374151; margin-bottom: 15px;">ما يمكنك فعله الآن:</h3>
                <ul style="color: #6b7280; line-height: 1.8;">
                  <li>إدارة العملاء والطلبات</li>
                  <li>متابعة المشاريع والفواتير</li>
                  <li>إرسال رسائل واتساب تلقائية</li>
                  <li>عرض التقارير والإحصائيات</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data?.loginUrl || window.location.origin}" 
                   style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                  الدخول إلى النظام
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 14px; text-align: center;">
                إذا كان لديك أي استفسارات، لا تتردد في التواصل معنا
              </p>
            </div>
          </div>
        `;
        break;

      case 'login_details':
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl; text-align: right;">
            <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">بيانات تسجيل الدخول</h1>
            </div>
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
              <h2 style="color: #374151; margin-bottom: 20px;">مرحباً ${data?.fullName || 'عزيزنا العميل'}</h2>
              <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
                تم إنشاء حسابك بنجاح. إليك بيانات تسجيل الدخول:
              </p>
              <div style="background: #f0f9ff; border: 1px solid #0ea5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #0c4a6e; margin-bottom: 15px;">بيانات الدخول:</h3>
                <p style="color: #0c4a6e; margin: 8px 0;"><strong>البريد الإلكتروني:</strong> ${to}</p>
                <p style="color: #0c4a6e; margin: 8px 0;"><strong>كلمة المرور المؤقتة:</strong> ${data?.tempPassword}</p>
              </div>
              <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  <strong>هام:</strong> يرجى تغيير كلمة المرور فور تسجيل الدخول لأول مرة لضمان أمان حسابك.
                </p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data?.loginUrl || window.location.origin}" 
                   style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                  تسجيل الدخول الآن
                </a>
              </div>
            </div>
          </div>
        `;
        break;

      case 'password_reset':
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl; text-align: right;">
            <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">إعادة تعيين كلمة المرور</h1>
            </div>
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
              <h2 style="color: #374151; margin-bottom: 20px;">طلب إعادة تعيين كلمة المرور</h2>
              <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
                تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. انقر على الرابط أدناه لإعادة تعيين كلمة مرور جديدة:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data?.resetLink}" 
                   style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                  إعادة تعيين كلمة المرور
                </a>
              </div>
              <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  <strong>ملاحظة:</strong> هذا الرابط صالح لمدة ساعة واحدة فقط. إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذه الرسالة.
                </p>
              </div>
              <p style="color: #9ca3af; font-size: 14px; text-align: center;">
                إذا كان لديك أي استفسارات، لا تتردد في التواصل معنا
              </p>
            </div>
          </div>
        `;
        break;

      case 'agency_login_details':
        const agencyUrl = `${new URL(req.url).origin}/admin/dashboard?agency=${data?.agencyId}`;
        const loginUrl = `${new URL(req.url).origin}/agency-login`;
        
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl; text-align: right;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 مرحباً بك في منصة إدارة الوكالات</h1>
              <p style="color: white; margin: 10px 0; opacity: 0.9;">تم إنشاء وكالتك بنجاح وتفعيل الاشتراك!</p>
            </div>
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
              <h2 style="color: #374151; margin-bottom: 20px;">تفاصيل وكالتك الجديدة:</h2>
              
              <div style="background: #e3f2fd; border-right: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="color: #1565c0; margin-bottom: 15px;">📋 معلومات الوكالة</h3>
                <p style="color: #1565c0; margin: 8px 0;"><strong>اسم الوكالة:</strong> ${data?.agencyName}</p>
                <p style="color: #1565c0; margin: 8px 0;"><strong>البريد الإلكتروني:</strong> ${data?.userEmail}</p>
              </div>

              <div style="background: #e8f5e8; border-right: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="color: #2e7d32; margin-bottom: 15px;">🔑 بيانات الدخول</h3>
                <p style="color: #2e7d32; margin: 10px 0;">استخدم نفس بيانات تسجيل الدخول التي استخدمتها لإنشاء الوكالة</p>
                
                <div style="text-align: center; margin: 20px 0;">
                  <a href="${loginUrl}" 
                     style="background: #4caf50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px;">
                    تسجيل الدخول للوكالة
                  </a>
                  <br>
                  <a href="${agencyUrl}" 
                     style="background: #2196f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px;">
                    دخول لوحة التحكم
                  </a>
                </div>
              </div>

              <div style="background: #fff3e0; border-right: 4px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="color: #ef6c00; margin-bottom: 15px;">📚 الخطوات التالية</h3>
                <ul style="color: #ef6c00; line-height: 1.8;">
                  <li>قم بتسجيل الدخول باستخدام نفس الإيميل وكلمة المرور المستخدمة</li>
                  <li>أكمل إعداد ملف الوكالة والإعدادات</li>
                  <li>ابدأ بإضافة العملاء والخدمات</li>
                  <li>قم بدعوة أعضاء فريقك للانضمام للوكالة</li>
                </ul>
              </div>

              <div style="background: #f3e5f5; border-right: 4px solid #9c27b0; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="color: #7b1fa2; margin-bottom: 15px;">💡 نصائح مهمة</h3>
                <ul style="color: #7b1fa2; line-height: 1.8;">
                  <li>احتفظ ببيانات الدخول في مكان آمن</li>
                  <li>يمكنك تخصيص إعدادات الوكالة من لوحة التحكم</li>
                  <li>تواصل مع الدعم الفني في حالة وجود أي استفسارات</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0; padding: 20px; border-top: 1px solid #eee;">
                <p style="color: #666; margin: 0;">شكراً لك لاختيار منصتنا لإدارة وكالتك</p>
                <p style="color: #666; margin: 5px 0;">فريق الدعم الفني</p>
              </div>
            </div>
          </div>
        `;
        break;

      default:
        throw new Error('نوع البريد الإلكتروني غير مدعوم');
    }

    console.log("📤 محاولة إرسال البريد إلى:", to);
    console.log("📧 نوع الرسالة:", type);

    const emailResponse = await resend.emails.send({
      from: "نظام إدارة الوكالات <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: htmlContent,
    });

    console.log("✅ استجابة Resend:", emailResponse);

    if (emailResponse.error) {
      console.error("❌ خطأ من Resend:", emailResponse.error);
      throw new Error(`Resend Error: ${emailResponse.error.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      messageId: emailResponse.data?.id,
      message: "تم إرسال البريد الإلكتروني بنجاح",
      details: emailResponse.data
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("💥 خطأ شامل في إرسال البريد الإلكتروني:", error);
    
    // تفاصيل أكثر عن الخطأ
    let errorDetails = {
      message: error.message || "فشل في إرسال البريد الإلكتروني",
      name: error.name,
      stack: error.stack
    };

    // إذا كان خطأ من Resend
    if (error.message?.includes('Resend')) {
      errorDetails.resendError = true;
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorDetails.message,
        details: errorDetails
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);