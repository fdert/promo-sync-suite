import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // استبدال دالة send_evaluation_on_order_complete باستخدام قالب order_completed
    const sqlCommand = `
CREATE OR REPLACE FUNCTION public.send_evaluation_on_order_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- التحقق من تغيير الحالة إلى "مكتمل"
  IF NEW.status = 'مكتمل' AND (OLD.status IS DISTINCT FROM 'مكتمل') THEN
    -- استدعاء send-order-status-notification بدلاً من إرسال رسالة منفصلة
    PERFORM net.http_post(
      url := 'https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/send-order-status-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcnprZnBvd2p1dHlsZWdkY3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MzU5NzIsImV4cCI6MjA3NDQxMTk3Mn0.frZ6OBDDuqbXOmQUydyoLdCnI5n5_WnS96x2qMPNR78'
      ),
      body := jsonb_build_object(
        'order_id', NEW.id,
        'new_status', 'مكتمل',
        'old_status', OLD.status
      )
    );
    
    RAISE NOTICE 'تم استدعاء send-order-status-notification للطلب: %', NEW.order_number;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'خطأ في إرسال إشعار اكتمال الطلب: %', SQLERRM;
    RETURN NEW;
END;
$function$;
`;

    const { error } = await supabase.rpc('exec_sql', { sql: sqlCommand });

    if (error) {
      console.error('Error updating function:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تم تحديث دالة send_evaluation_on_order_complete لاستخدام قالب order_completed' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
