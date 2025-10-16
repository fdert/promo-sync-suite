import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { email, password, name, role, permissions } = await req.json();

    // التحقق من البيانات المطلوبة
    if (!email || !name || !role) {
      return new Response(
        JSON.stringify({ error: 'البريد الإلكتروني والاسم والدور مطلوبة' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // إنشاء كلمة مرور عشوائية إذا لم تُقدم
    const userPassword = password || `Temp${Math.random().toString(36).slice(-8)}!`;

    // إنشاء المستخدم في Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email: email,
      password: userPassword,
      email_confirm: true,
      user_metadata: {
        full_name: name
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const userId = authData.user.id;

    // إنشاء profile للمستخدم
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        id: userId,
        full_name: name,
        status: 'active'
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // محاولة حذف المستخدم من Auth إذا فشل إنشاء Profile
      await supabaseClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: 'فشل في إنشاء ملف المستخدم' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // إضافة دور المستخدم
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role
      });

    if (roleError) {
      console.error('Error creating user role:', roleError);
    }

    // إضافة صلاحيات المستخدم
    if (permissions && permissions.length > 0) {
      const permissionsData = permissions.map((permission: string) => ({
        user_id: userId,
        permission: permission
      }));

      const { error: permissionsError } = await supabaseClient
        .from('user_permissions')
        .insert(permissionsData);

      if (permissionsError) {
        console.error('Error creating user permissions:', permissionsError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userId,
          email: email,
          name: name,
          role: role,
          temporaryPassword: password ? undefined : userPassword
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in create-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
