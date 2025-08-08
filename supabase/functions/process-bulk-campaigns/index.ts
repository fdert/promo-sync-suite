import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 Function started - method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('📋 Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('⚡ Processing bulk campaigns - START');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Read request body
    let requestBody = {};
    try {
      if (req.method === 'POST') {
        requestBody = await req.json();
        console.log('📝 Request body:', requestBody);
      }
    } catch (error) {
      console.log('⚠️ Error reading request body:', error);
    }

    const specificCampaignId = requestBody?.campaignId;
    console.log('🎯 Specific campaign ID:', specificCampaignId);

    // Build query for campaigns
    let campaignsQuery = supabaseClient
      .from('bulk_campaigns')
      .select('*');

    if (specificCampaignId) {
      console.log('🔍 Looking for specific campaign:', specificCampaignId);
      campaignsQuery = campaignsQuery.eq('id', specificCampaignId);
    } else {
      console.log('🔍 Looking for all ready campaigns');
      campaignsQuery = campaignsQuery
        .in('status', ['draft', 'scheduled', 'sending'])
        .or('scheduled_at.is.null,scheduled_at.lte.' + new Date().toISOString());
    }

    const { data: campaigns, error: campaignsError } = await campaignsQuery;

    if (campaignsError) {
      console.error('❌ Error fetching campaigns:', campaignsError);
      throw campaignsError;
    }

    console.log('📊 Found campaigns:', campaigns?.length || 0);

    if (!campaigns || campaigns.length === 0) {
      console.log('📭 No campaigns ready for sending');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'لا توجد حملات جاهزة للإرسال',
          processed_campaigns: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    let processedCount = 0;

    for (const campaign of campaigns) {
      console.log(`🎯 Processing campaign: ${campaign.name} (${campaign.id})`);

      try {
        // Update campaign status to sending
        const { error: updateError } = await supabaseClient
          .from('bulk_campaigns')
          .update({ 
            status: 'sending', 
            started_at: new Date().toISOString() 
          })
          .eq('id', campaign.id);

        if (updateError) {
          console.error(`❌ Error updating campaign ${campaign.name}:`, updateError);
          continue;
        }

        console.log(`✅ Updated campaign ${campaign.name} status to sending`);

        // Create campaign messages
        const { error: processError } = await supabaseClient
          .rpc('process_bulk_campaign', { campaign_id_param: campaign.id });

        if (processError) {
          console.error(`❌ Error processing campaign ${campaign.name}:`, processError);
          
          await supabaseClient
            .from('bulk_campaigns')
            .update({ 
              status: 'failed',
              error_message: processError.message,
              completed_at: new Date().toISOString()
            })
            .eq('id', campaign.id);
          
          continue;
        }

        console.log(`✅ Successfully processed campaign: ${campaign.name}`);
        processedCount++;

        // Mark campaign as completed
        await supabaseClient
          .from('bulk_campaigns')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', campaign.id);

      } catch (campaignError) {
        console.error(`❌ Error in campaign ${campaign.name}:`, campaignError);
        
        await supabaseClient
          .from('bulk_campaigns')
          .update({ 
            status: 'failed',
            error_message: campaignError.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', campaign.id);
      }
    }

    console.log(`🎉 Processing complete. Processed ${processedCount} campaigns`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'تم معالجة الحملات بنجاح',
        processed_campaigns: processedCount,
        total_campaigns: campaigns.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('💥 Critical error in bulk campaigns processing:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'فشل في معالجة الحملات الجماعية',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});