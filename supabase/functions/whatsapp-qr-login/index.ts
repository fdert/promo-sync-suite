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
      case 'generate_qr': {
        // In a real implementation, you would:
        // 1. Initialize WhatsApp Web client (using baileys or similar)
        // 2. Generate QR code
        // 3. Return QR code as base64 image
        
        // For now, we'll create a placeholder that explains the limitation
        const qrCodeSVG = generatePlaceholderQR(phone_number);
        
        // Store session initialization
        const { data: session, error } = await supabase
          .from('whatsapp_sessions')
          .insert({
            phone_number,
            status: 'waiting_for_scan',
            qr_code: qrCodeSVG,
          })
          .select()
          .single();

        if (error) throw error;

        activeSessions.set(phone_number, {
          status: 'waiting_for_scan',
          session_id: session.id,
          created_at: new Date(),
        });

        return new Response(
          JSON.stringify({
            success: true,
            qr_code: qrCodeSVG,
            session_id: session.id,
            message: 'QR Code generated. Note: This is a demo implementation.',
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

function generatePlaceholderQR(phoneNumber: string): string {
  // Generate a placeholder QR code SVG
  const qrData = `whatsapp://qr/${phoneNumber}/${Date.now()}`;
  
  // Simple QR-like SVG placeholder
  return `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <rect width="256" height="256" fill="white"/>
      <text x="128" y="100" font-family="Arial" font-size="14" text-anchor="middle" fill="black">
        WhatsApp QR Code
      </text>
      <text x="128" y="130" font-family="Arial" font-size="12" text-anchor="middle" fill="gray">
        ${phoneNumber}
      </text>
      <text x="128" y="160" font-family="Arial" font-size="10" text-anchor="middle" fill="red">
        Demo Implementation
      </text>
      <text x="128" y="180" font-family="Arial" font-size="9" text-anchor="middle" fill="gray">
        Requires WhatsApp Web integration
      </text>
      <rect x="50" y="50" width="156" height="156" fill="none" stroke="black" stroke-width="2"/>
    </svg>
  `)}`
}