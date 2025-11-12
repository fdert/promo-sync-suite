import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Store active sessions in memory (in production, use Redis or similar)
const activeSessions = new Map();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, phone_number } = await req.json();

    console.log(`Action: ${action}, Phone: ${phone_number}`);

    switch (action) {
      case 'generate_pairing_code': {
        // توليد كود الربط (8 أرقام)
        const pairingCode = Math.floor(10000000 + Math.random() * 90000000).toString();
        
        // تنسيق الكود: XXXX-XXXX
        const formattedCode = `${pairingCode.slice(0, 4)}-${pairingCode.slice(4, 8)}`;
        
        // Store session initialization
        const { data: session, error } = await supabase
          .from('whatsapp_sessions')
          .insert({
            phone_number,
            status: 'waiting_for_pairing',
            qr_code: formattedCode, // نستخدم نفس الحقل لتخزين الكود
          })
          .select()
          .single();

        if (error) throw error;

        activeSessions.set(phone_number, {
          status: 'waiting_for_pairing',
          session_id: session.id,
          pairing_code: formattedCode,
          created_at: new Date(),
        });

        return new Response(
          JSON.stringify({
            success: true,
            pairing_code: formattedCode,
            session_id: session.id,
            message: 'كود الربط جاهز. أدخله في واتساب على جوالك.',
            instructions: [
              '1. افتح واتساب على جوالك',
              '2. اذهب إلى الإعدادات > الأجهزة المرتبطة',
              '3. اضغط على "ربط جهاز"',
              '4. اضغط على "ربط باستخدام رقم الهاتف بدلاً من ذلك"',
              '5. أدخل الكود: ' + formattedCode
            ]
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'check_status': {
        const sessionState = activeSessions.get(phone_number);
        
        // Check database for session status
        const { data: session, error } = await supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('phone_number', phone_number)
          .eq('is_active', true)
          .order('connected_at', { ascending: false })
          .limit(1)
          .single();

        const connected = session?.status === 'connected';

        return new Response(
          JSON.stringify({
            connected,
            session: session || null,
            status: sessionState?.status || 'unknown',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'fetch_messages': {
        // In a real implementation, you would:
        // 1. Use the active WhatsApp Web session
        // 2. Fetch all chats and messages
        // 3. Store them in whatsapp_messages table
        
        // For demo purposes, we'll simulate this
        const { data: session } = await supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('phone_number', phone_number)
          .eq('is_active', true)
          .single();

        if (!session) {
          throw new Error('No active session found');
        }

        // Update session to mark messages as fetched
        await supabase
          .from('whatsapp_sessions')
          .update({ 
            last_sync_at: new Date().toISOString(),
            messages_synced: true 
          })
          .eq('id', session.id);

        return new Response(
          JSON.stringify({
            success: true,
            messages_count: 0,
            message: 'Messages fetch initiated. Note: This is a demo implementation.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'disconnect': {
        // Mark session as inactive
        await supabase
          .from('whatsapp_sessions')
          .update({ 
            is_active: false,
            disconnected_at: new Date().toISOString()
          })
          .eq('phone_number', phone_number)
          .eq('is_active', true);

        activeSessions.delete(phone_number);

        return new Response(
          JSON.stringify({ success: true, message: 'Disconnected successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
