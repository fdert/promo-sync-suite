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

    const { email, password, name, phone, role, permissions } = await req.json();

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

      const isEmailExists = (authError as any)?.code === 'email_exists' ||
        authError.message.includes('already been registered') ||
        authError.message.includes('email_exists');

      if (isEmailExists) {
        // في حال كان البريد مسجلاً مسبقاً: نربط الدور والصلاحيات بالحساب الموجود بدلاً من الفشل
        const { data: existingProfile } = await supabaseClient
          .from('profiles')
          .select('id, full_name, email')
          .eq('email', email)
          .maybeSingle();

        if (!existingProfile) {
          return new Response(
            JSON.stringify({ error: 'هذا البريد مسجل بالفعل، لكن لم نعثر على ملف المستخدم. يرجى أن يقوم المستخدم بتسجيل الدخول مرة واحدة ثم أعد المحاولة.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        const existingUserId = existingProfile.id;

        // تحديث الاسم إن لم يكن موجوداً
        if (!existingProfile.full_name && name) {
          await supabaseClient.from('profiles')
            .update({ 
              full_name: name,
              phone: phone || null
            })
            .eq('id', existingUserId);
        } else if (phone) {
          await supabaseClient.from('profiles')
            .update({ phone })
            .eq('id', existingUserId);
        }

        // Upsert للدور لتجنب التكرار (يوجد قيد فريد على user_id, role)
        await supabaseClient
          .from('user_roles')
          .upsert({ user_id: existingUserId, role }, { onConflict: 'user_id,role', ignoreDuplicates: true });

        // إدراج الصلاحيات الجديدة فقط
        if (Array.isArray(permissions) && permissions.length > 0) {
          const { data: existingPerms } = await supabaseClient
            .from('user_permissions')
            .select('permission')
            .eq('user_id', existingUserId);

          const existingSet = new Set((existingPerms || []).map((p: any) => p.permission));
          const toInsert = permissions
            .filter((p: string) => !existingSet.has(p))
            .map((p: string) => ({ user_id: existingUserId, permission: p }));

          if (toInsert.length > 0) {
            await supabaseClient.from('user_permissions').insert(toInsert);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            user: { id: existingUserId, email, name, role, existed: true }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      // ترجمة رسائل الخطأ الشائعة إلى العربية
      let errorMessage = authError.message;
      if (authError.message.includes('invalid email')) {
        errorMessage = 'البريد الإلكتروني غير صالح';
      } else if (authError.message.includes('password')) {
        errorMessage = 'كلمة المرور غير صالحة. يجب أن تكون 6 أحرف على الأقل';
      }

      return new Response(
        JSON.stringify({ error: errorMessage }),
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
        email: email,
        phone: phone || null,
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
