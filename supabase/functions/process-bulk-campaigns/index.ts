import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🚀 معالجة الحملات الجماعية...');

    // جلب الحملات في حالة processing أو sending
    const { data: campaigns, error: campaignsError } = await supabaseClient
      .from('bulk_campaigns')
      .select('*')
      .in('status', ['processing', 'sending'])
      .order('created_at', { ascending: true });

    if (campaignsError) {
      console.error('خطأ في جلب الحملات:', campaignsError);
      throw campaignsError;
    }

    if (!campaigns || campaigns.length === 0) {
      console.log('لا توجد حملات للمعالجة');
      return new Response(
        JSON.stringify({ message: 'لا توجد حملات للمعالجة' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`تم العثور على ${campaigns.length} حملة للمعالجة`);

    let totalProcessed = 0;
    const results = [];

    for (const campaign of campaigns) {
      try {
        console.log(`معالجة الحملة: ${campaign.name} (${campaign.id})`);

        // جلب الرسائل المعلقة لهذه الحملة
        const { data: pendingMessages, error: messagesError } = await supabaseClient
          .from('whatsapp_messages')
          .select('*')
          .eq('status', 'pending')
          .contains('message_content', campaign.message_content.substring(0, 20))
          .limit(50);

        if (messagesError) {
          console.error('خطأ في جلب رسائل الحملة:', messagesError);
          continue;
        }

        if (!pendingMessages || pendingMessages.length === 0) {
          // إذا لم توجد رسائل معلقة، اعتبر الحملة مكتملة
          console.log(`لا توجد رسائل معلقة للحملة ${campaign.name}`);
          
          await supabaseClient
            .from('bulk_campaigns')
            .update({ 
              status: 'completed', 
              completed_at: new Date().toISOString() 
            })
            .eq('id', campaign.id);

          results.push({
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            status: 'completed',
            processed_messages: 0
          });
          continue;
        }

        console.log(`تم العثور على ${pendingMessages.length} رسالة معلقة للحملة ${campaign.name}`);

        // استدعاء process-whatsapp-queue لمعالجة الرسائل
        const { data: processResult, error: processError } = await supabaseClient.functions.invoke('process-whatsapp-queue', {
          body: JSON.stringify({ 
            action: 'process_pending_messages',
            campaign_id: campaign.id,
            timestamp: new Date().toISOString()
          }),
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (processError) {
          console.error(`خطأ في معالجة رسائل الحملة ${campaign.name}:`, processError);
          
          await supabaseClient
            .from('bulk_campaigns')
            .update({ 
              status: 'failed', 
              error_message: processError.message,
              completed_at: new Date().toISOString()
            })
            .eq('id', campaign.id);

          results.push({
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            status: 'failed',
            error: processError.message
          });
          continue;
        }

        const processedCount = processResult?.processed_count || 0;
        totalProcessed += processedCount;

        console.log(`تم معالجة ${processedCount} رسالة للحملة ${campaign.name}`);

        // تحديث إحصائيات الحملة
        const sentCount = processResult?.results?.filter((r: any) => r.status === 'sent')?.length || 0;
        const failedCount = processResult?.results?.filter((r: any) => r.status === 'failed')?.length || 0;

        await supabaseClient
          .from('bulk_campaigns')
          .update({ 
            sent_count: (campaign.sent_count || 0) + sentCount,
            failed_count: (campaign.failed_count || 0) + failedCount
          })
          .eq('id', campaign.id);

        // إذا تم معالجة جميع الرسائل، غيّر الحالة إلى completed
        const { data: remainingMessages } = await supabaseClient
          .from('whatsapp_messages')
          .select('id')
          .eq('status', 'pending')
          .contains('message_content', campaign.message_content.substring(0, 20))
          .limit(1);

        if (!remainingMessages || remainingMessages.length === 0) {
          await supabaseClient
            .from('bulk_campaigns')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', campaign.id);

          console.log(`تم اكتمال الحملة: ${campaign.name}`);
        }

        results.push({
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          status: processedCount > 0 ? 'processed' : 'no_pending_messages',
          processed_messages: processedCount,
          sent_count: sentCount,
          failed_count: failedCount
        });

      } catch (error) {
        console.error(`خطأ في معالجة الحملة ${campaign.name}:`, error);
        
        await supabaseClient
          .from('bulk_campaigns')
          .update({ 
            status: 'failed', 
            error_message: error.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', campaign.id);

        results.push({
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          status: 'failed',
          error: error.message
        });
      }
    }

    console.log(`اكتملت معالجة الحملات. إجمالي الرسائل المعالجة: ${totalProcessed}`);

    return new Response(
      JSON.stringify({
        success: true,
        total_campaigns_processed: campaigns.length,
        total_messages_processed: totalProcessed,
        results: results,
        message: `تم معالجة ${campaigns.length} حملة مع ${totalProcessed} رسالة`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('خطأ عام في معالجة الحملات:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})