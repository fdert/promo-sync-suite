-- Force create new evaluation message for completed order
DO $$
DECLARE
  eval_token TEXT;
  eval_id UUID;
  customer_phone TEXT;
  v_dedupe TEXT;
  order_record RECORD;
BEGIN
  -- Get order details
  SELECT o.*, c.whatsapp, c.phone INTO order_record
  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  WHERE o.id = '9e98f84a-238c-402a-ab61-b7eb34dc563d'
  AND o.status = 'مكتمل';

  IF FOUND THEN
    customer_phone := COALESCE(order_record.whatsapp, order_record.phone);
    
    IF COALESCE(customer_phone, '') != '' THEN
      -- Generate new token
      eval_token := md5(order_record.id::text || clock_timestamp()::text || random()::text);
      
      -- Update evaluation with new token
      UPDATE evaluations 
      SET evaluation_token = eval_token,
          sent_at = NULL
      WHERE order_id = order_record.id;
      
      -- Create new dedupe key with timestamp to force new message
      v_dedupe := 'evaluation:' || order_record.id::text || ':' || extract(epoch from now())::text;
      
      -- Insert new evaluation message
      INSERT INTO whatsapp_messages (
        to_number,
        message_type,
        message_content,
        customer_id,
        status,
        is_reply,
        dedupe_key
      )
      VALUES (
        customer_phone,
        'text',
        '🌟 عزيزنا العميل، شكراً لثقتك بنا!' || E'\n\n' ||
        '✅ تم اكتمال طلبك رقم: ' || order_record.order_number || E'\n\n' ||
        '📝 نرجو تقييم تجربتك معنا من خلال الرابط التالي:' || E'\n' ||
        'https://pqrzkfpowjutylegdcxj.supabase.co/evaluation/' || eval_token || E'\n\n' ||
        '⭐ رأيك يهمنا لتحسين خدماتنا',
        order_record.customer_id,
        'pending',
        false,
        v_dedupe
      );
      
      RAISE NOTICE 'Created new evaluation message for order % to %', order_record.order_number, customer_phone;
    END IF;
  END IF;
END $$;