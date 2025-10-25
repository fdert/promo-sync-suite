-- Enqueue another evaluation WhatsApp message with unique dedupe to bypass any throttle
DO $$
DECLARE
  v_order_id uuid := '9e98f84a-238c-402a-ab61-b7eb34dc563d';
  v_customer_id uuid := 'e14fa77d-5ac7-4f67-87cf-b39ed90c11ac';
  v_phone text := '+966541895145';
  v_order_number text := 'ORD-20251023-00167';
  v_token text := (SELECT evaluation_token FROM evaluations WHERE order_id = v_order_id LIMIT 1);
  v_dedupe text;
  v_content text;
BEGIN
  IF v_token IS NULL THEN
    v_token := md5(v_order_id::text || clock_timestamp()::text || random()::text);
    UPDATE evaluations SET evaluation_token = v_token, sent_at = NULL WHERE order_id = v_order_id;
  END IF;

  v_dedupe := 'evaluation:' || v_order_id::text || ':' || extract(epoch from now())::text;
  v_content := '🌟 عزيزنا العميل، شكراً لثقتك بنا!' || E'\n\n' ||
               '✅ تم اكتمال طلبك رقم: ' || v_order_number || E'\n' ||
               '📝 نرجو تقييم تجربتك: ' || 'https://pqrzkfpowjutylegdcxj.supabase.co/evaluation/' || v_token;

  INSERT INTO whatsapp_messages (
    to_number, message_type, message_content, customer_id, status, is_reply, dedupe_key
  ) VALUES (
    v_phone, 'text', v_content, v_customer_id, 'pending', false, v_dedupe
  );
END $$;