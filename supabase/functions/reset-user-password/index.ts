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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, newPassword, adminUserId }: ResetPasswordRequest = await req.json();

    // التحقق من الصلاحيات - يجب أن يكون المستخدم مدير في الوكالة أو super_admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // التحقق من أن المدير لديه صلاحية
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUserId);

    const hasPermission = adminRoles?.some(role => 
      ['admin', 'super_admin', 'manager'].includes(role.role)
    );

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: "ليس لديك صلاحية لإعادة تعيين كلمات المرور" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // البحث عن المستخدم بالبريد الإلكتروني
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
      return new Response(
        JSON.stringify({ error: "المستخدم غير موجود" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // إعادة تعيين كلمة المرور
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      targetUser.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: "خطأ في تحديث كلمة المرور" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // تسجيل النشاط في activity_logs
    await supabase
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
      JSON.stringify({ error: "حدث خطأ غير متوقع" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);