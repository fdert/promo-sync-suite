-- Insert a fresh evaluation WhatsApp message and force send via unique dedupe key
DO $$
DECLARE
  v_order_id uuid := '9e98f84a-238c-402a-ab61-b7eb34dc563d';
  v_customer_id uuid := 'e14fa77d-5ac7-4f67-87cf-b39ed90c11ac';
  v_phone text := '+966541895145';
  v_order_number text := 'ORD-20251023-00167';
  v_token text := (SELECT evaluation_token FROM evaluations WHERE order_id = v_order_id LIMIT 1);
  v_dedupe text;
BEGIN
  IF v_token IS NULL THEN
    -- if no token, generate one and update evaluation
    v_token := md5(v_order_id::text || clock_timestamp()::text || random()::text);
    UPDATE evaluations SET evaluation_token = v_token, sent_at = NULL WHERE order_id = v_order_id;
  END IF;

  v_dedupe := 'evaluation:' || v_order_id::text || ':' || extract(epoch from now())::text;

  INSERT INTO whatsapp_messages (
    to_number, message_type, message_content, customer_id, status, is_reply, dedupe_key
  ) VALUES (
    v_phone,
    'text',
    '🌟 عزيزنا العميل، شكراً لثقتك بنا!' || E'\n\n' ||
    '✅ تم اكتمال طلبك رقم: ' || v_order_number || E'\n\n' ||
    '📝 نرجو تقييم تجربتك معنا من خلال الرابط التالي:' || E'\n' ||
    'https://pqrzkfpowjutylegdcxj.supabase.co/evaluation/' || v_token || E'\n\n' ||
    '⭐ رأيك يهمنا لتحسين خدماتنا',
    v_customer_id,
    'pending',
    false,
    v_dedupe
  );
END $$;