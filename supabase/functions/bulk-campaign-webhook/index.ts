import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkCampaignWebhookData {
  campaign_id: string;
  campaign_name: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  message_content: string;
  target_type: string;
  target_groups?: string[];
  started_at?: string;
  completed_at?: string;
  created_by: string;
}

serve(async (req) => {
  console.log('🚀 Bulk Campaign Webhook triggered');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // قراءة بيانات الطلب
    const requestBody = await req.json();
    const { campaign_id, webhook_url, trigger_type = 'campaign_completed' } = requestBody;

    console.log('معالجة الحملة:', campaign_id);
    console.log('نوع التفعيل:', trigger_type);

    // إذا كان اختبار، إرسال بيانات تجريبية
    if (trigger_type === 'test' || campaign_id === 'test-campaign-id') {
      const testData = {
        campaign_id: 'test-campaign-id',
        campaign_name: 'حملة تجريبية',
        status: 'test',
        total_recipients: 100,
        sent_count: 95,
        failed_count: 5,
        message_content: 'رسالة تجريبية للاختبار',
        target_type: 'all',
        target_groups: [],
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        created_by: 'test-user',
        webhook_triggered_at: new Date().toISOString(),
        trigger_type: 'test',
        success_rate: '95.00',
        platform: 'Lovable WhatsApp System',
        version: '1.0',
      };

      console.log('إرسال بيانات تجريبية:', testData);

      // إرسال الـ webhook إلى n8n أو أي منصة أخرى
      if (webhook_url) {
        console.log('إرسال webhook تجريبي إلى:', webhook_url);
        
        const webhookResponse = await fetch(webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Lovable-WhatsApp-Webhook/1.0',
          },
          body: JSON.stringify(testData),
        });

        if (!webhookResponse.ok) {
          console.error('فشل في إرسال الـ webhook التجريبي:', webhookResponse.statusText);
          throw new Error(`فشل في إرسال الـ webhook: ${webhookResponse.statusText}`);
        }

        console.log('تم إرسال الـ webhook التجريبي بنجاح');
      }

      // حفظ سجل الـ webhook
      await supabaseClient
        .from('webhook_logs')
        .insert({
          webhook_type: 'bulk_campaign',
          campaign_id: 'test-campaign-id',
          webhook_url: webhook_url,
          trigger_type: 'test',
          status: 'sent',
          response_data: testData,
          created_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'تم إرسال webhook تجريبي بنجاح',
          data: testData
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // جلب بيانات الحملة الحقيقية
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('bulk_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`خطأ في جلب بيانات الحملة: ${campaignError?.message}`);
    }

    // جلب بيانات المجموعات المستهدفة إذا كانت موجودة
    let targetGroupsData = null;
    if (campaign.target_groups && campaign.target_groups.length > 0) {
      const { data: groups } = await supabaseClient
        .from('customer_groups')
        .select('id, name')
        .in('id', campaign.target_groups);
      
      targetGroupsData = groups;
    }

    // إعداد بيانات الـ webhook
    const webhookData: BulkCampaignWebhookData = {
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      status: campaign.status,
      total_recipients: campaign.total_recipients || 0,
      sent_count: campaign.sent_count || 0,
      failed_count: campaign.failed_count || 0,
      message_content: campaign.message_content,
      target_type: campaign.target_type,
      target_groups: targetGroupsData?.map(g => g.name) || [],
      started_at: campaign.started_at,
      completed_at: campaign.completed_at,
      created_by: campaign.created_by,
    };

    // إضافة معلومات إضافية
    const enrichedData = {
      ...webhookData,
      webhook_triggered_at: new Date().toISOString(),
      trigger_type,
      success_rate: webhookData.total_recipients > 0 
        ? (webhookData.sent_count / webhookData.total_recipients * 100).toFixed(2)
        : '0',
      platform: 'Lovable WhatsApp System',
      version: '1.0',
    };

    console.log('بيانات الـ webhook:', enrichedData);

    // إرسال الـ webhook إلى n8n أو أي منصة أخرى
    if (webhook_url) {
      console.log('إرسال webhook إلى:', webhook_url);
      
      const webhookResponse = await fetch(webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Lovable-WhatsApp-Webhook/1.0',
        },
        body: JSON.stringify(enrichedData),
      });

      if (!webhookResponse.ok) {
        console.error('فشل في إرسال الـ webhook:', webhookResponse.statusText);
        throw new Error(`فشل في إرسال الـ webhook: ${webhookResponse.statusText}`);
      }

      console.log('تم إرسال الـ webhook بنجاح');
    }

    // حفظ سجل الـ webhook (اختياري)
    await supabaseClient
      .from('webhook_logs')
      .insert({
        webhook_type: 'bulk_campaign',
        campaign_id: campaign_id,
        webhook_url: webhook_url,
        trigger_type,
        status: 'sent',
        response_data: enrichedData,
        created_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'تم إرسال webhook بنجاح',
        data: enrichedData
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('خطأ في معالجة الـ webhook:', error);
    
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