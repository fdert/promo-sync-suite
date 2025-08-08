import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Database {
  public: {
    Tables: {
      bulk_campaigns: {
        Row: {
          id: string;
          name: string;
          message_content: string;
          target_type: 'all' | 'groups';
          target_groups: string[];
          status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed' | 'paused';
          total_recipients: number;
          sent_count: number;
          failed_count: number;
          delay_between_messages: number;
          created_at: string;
          created_by: string;
        };
      };
      bulk_campaign_messages: {
        Row: {
          id: string;
          campaign_id: string;
          customer_id: string;
          whatsapp_number: string;
          message_content: string;
          status: 'pending' | 'sent' | 'failed' | 'delivered';
          sent_at: string | null;
          error_message: string | null;
          created_at: string;
        };
      };
      whatsapp_messages: {
        Row: {
          id: string;
          from_number: string;
          to_number: string;
          message_type: string;
          message_content: string;
          status: string;
          customer_id: string;
          created_at: string;
        };
        Insert: {
          from_number: string;
          to_number: string;
          message_type: string;
          message_content: string;
          status: string;
          customer_id: string;
        };
      };
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('معالجة الحملات الجماعية...');

    // البحث عن الحملات المجدولة والمستعدة للإرسال
    const { data: campaigns, error: campaignsError } = await supabaseClient
      .from('bulk_campaigns')
      .select('*')
      .in('status', ['draft', 'scheduled'])
      .or('scheduled_at.is.null,scheduled_at.lte.' + new Date().toISOString());

    if (campaignsError) {
      console.error('خطأ في جلب الحملات:', campaignsError);
      throw campaignsError;
    }

    if (!campaigns || campaigns.length === 0) {
      console.log('لا توجد حملات جاهزة للإرسال');
      return new Response(
        JSON.stringify({ message: 'لا توجد حملات جاهزة للإرسال' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    for (const campaign of campaigns) {
      console.log(`معالجة الحملة: ${campaign.name}`);

      try {
        // استدعاء دالة قاعدة البيانات لمعالجة الحملة
        const { error: processError } = await supabaseClient
          .rpc('process_bulk_campaign', { campaign_id_param: campaign.id });

        if (processError) {
          console.error(`خطأ في معالجة الحملة ${campaign.name}:`, processError);
          
          // تحديث حالة الحملة إلى فاشلة
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

        // جلب رسائل الحملة المعلقة
        const { data: messages, error: messagesError } = await supabaseClient
          .from('bulk_campaign_messages')
          .select('*')
          .eq('campaign_id', campaign.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: true });

        if (messagesError) {
          console.error(`خطأ في جلب رسائل الحملة ${campaign.name}:`, messagesError);
          continue;
        }

        if (!messages || messages.length === 0) {
          console.log(`لا توجد رسائل معلقة للحملة: ${campaign.name}`);
          
          // تحديث حالة الحملة إلى مكتملة
          await supabaseClient
            .from('bulk_campaigns')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', campaign.id);
          
          continue;
        }

        console.log(`إرسال ${messages.length} رسالة للحملة: ${campaign.name}`);
        
        let sentCount = 0;
        let failedCount = 0;

        // إرسال الرسائل مع الفاصل الزمني
        for (let i = 0; i < messages.length; i++) {
          const message = messages[i];
          
          try {
            // إضافة الرسالة إلى جدول رسائل الواتساب
            const { error: whatsappError } = await supabaseClient
              .from('whatsapp_messages')
              .insert({
                from_number: 'system',
                to_number: message.whatsapp_number,
                message_type: 'text',
                message_content: message.message_content,
                status: 'pending',
                customer_id: message.customer_id
              });

            if (whatsappError) {
              console.error(`خطأ في إرسال الرسالة للعميل ${message.customer_id}:`, whatsappError);
              
              // تحديث حالة الرسالة إلى فاشلة
              await supabaseClient
                .from('bulk_campaign_messages')
                .update({ 
                  status: 'failed',
                  error_message: whatsappError.message
                })
                .eq('id', message.id);
              
              failedCount++;
            } else {
              // تحديث حالة الرسالة إلى مرسلة
              await supabaseClient
                .from('bulk_campaign_messages')
                .update({ 
                  status: 'sent',
                  sent_at: new Date().toISOString()
                })
                .eq('id', message.id);
              
              sentCount++;
              console.log(`تم إرسال الرسالة ${i + 1}/${messages.length} للعميل ${message.customer_id}`);
            }

            // الانتظار بين الرسائل (الفاصل الزمني)
            if (i < messages.length - 1) {
              const delayMs = (campaign.delay_between_messages || 5) * 1000;
              console.log(`انتظار ${campaign.delay_between_messages || 5} ثانية قبل الرسالة التالية...`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }

          } catch (messageError) {
            console.error(`خطأ في معالجة الرسالة ${message.id}:`, messageError);
            failedCount++;
          }
        }

        // تحديث إحصائيات الحملة
        await supabaseClient
          .from('bulk_campaigns')
          .update({
            status: 'completed',
            sent_count: sentCount,
            failed_count: failedCount,
            completed_at: new Date().toISOString()
          })
          .eq('id', campaign.id);

        console.log(`تم إكمال الحملة ${campaign.name}: ${sentCount} مرسلة، ${failedCount} فاشلة`);

      } catch (campaignError) {
        console.error(`خطأ في معالجة الحملة ${campaign.name}:`, campaignError);
        
        // تحديث حالة الحملة إلى فاشلة
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

    return new Response(
      JSON.stringify({ 
        message: 'تم معالجة الحملات بنجاح',
        processed_campaigns: campaigns.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('خطأ في معالجة الحملات الجماعية:', error);
    
    return new Response(
      JSON.stringify({ 
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