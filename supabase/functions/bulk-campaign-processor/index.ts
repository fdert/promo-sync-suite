import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 Bulk campaigns processor started');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Read request data
    let requestBody = {};
    if (req.method === 'POST') {
      requestBody = await req.json();
    }
    
    const campaignId = requestBody?.campaignId;
    console.log('Processing campaign:', campaignId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (campaignId) {
      // Process specific campaign
      console.log('Processing specific campaign:', campaignId);
      
      // Update campaign status
      const { error: updateError } = await supabaseClient
        .from('bulk_campaigns')
        .update({ 
          status: 'sending', 
          started_at: new Date().toISOString() 
        })
        .eq('id', campaignId);

      if (updateError) {
        throw updateError;
      }

      // Call the database function to create messages
      const { error: processError } = await supabaseClient
        .rpc('process_bulk_campaign', { campaign_id_param: campaignId });

      if (processError) {
        console.error('Process error:', processError);
        throw processError;
      }

      // Mark as completed
      await supabaseClient
        .from('bulk_campaigns')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      console.log('Campaign processed successfully');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'تم معالجة الحملة بنجاح',
        campaignId: campaignId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error processing campaign:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});