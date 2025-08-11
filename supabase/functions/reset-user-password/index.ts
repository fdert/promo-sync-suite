import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  userEmail: string;
  newPassword: string;
  adminUserId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Reset password function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    console.log("Request data received:", { ...requestData, newPassword: "[HIDDEN]" });
    
    const { userEmail, newPassword, adminUserId }: ResetPasswordRequest = requestData;

    if (!userEmail || !newPassword || !adminUserId) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "البيانات المطلوبة ناقصة" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // إنشاء عميل Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "خطأ في إعدادات الخادم" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // التحقق من أن المدير لديه صلاحية
    console.log("Checking admin permissions for user:", adminUserId);
    
    // التحقق من الأذونات باستخدام استعلام مباشر للتأكد من وجود الدور
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUserId)
      .in('role', ['admin', 'super_admin', 'manager']);

    if (rolesError) {
      console.error("Error checking user roles:", rolesError);
      return new Response(
        JSON.stringify({ error: "خطأ في التحقق من الصلاحيات" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!userRoles || userRoles.length === 0) {
      console.log("User does not have required permissions");
      return new Response(
        JSON.stringify({ error: "ليس لديك صلاحية لإعادة تعيين كلمات المرور" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("User has valid permissions:", userRoles);

    // البحث عن المستخدم بالبريد الإلكتروني
    console.log("Looking for user with email:", userEmail);
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error("Error fetching users:", userError);
      return new Response(
        JSON.stringify({ error: "خطأ في البحث عن المستخدم" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const targetUser = userData.users.find(user => user.email === userEmail);
    
    if (!targetUser) {
      console.log("User not found:", userEmail);
      return new Response(
        JSON.stringify({ error: "المستخدم غير موجود" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // إعادة تعيين كلمة المرور
    console.log("Updating password for user:", targetUser.id);
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      targetUser.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: "خطأ في تحديث كلمة المرور: " + updateError.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // تسجيل النشاط في activity_logs
    console.log("Logging activity");
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        user_id: adminUserId,
        action: 'password_reset',
        resource_type: 'user',
        resource_id: targetUser.id,
        details: {
          target_user_email: userEmail,
          target_user_id: targetUser.id,
          admin_user_id: adminUserId
        }
      });

    if (logError) {
      console.error("Error logging activity:", logError);
      // لا نفشل العملية بسبب خطأ في السجل
    }

    console.log("Password reset successful");
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "تم إعادة تعيين كلمة المرور بنجاح" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error) {
    console.error("Error in reset-user-password function:", error);
    return new Response(
      JSON.stringify({ error: "حدث خطأ غير متوقع: " + error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);