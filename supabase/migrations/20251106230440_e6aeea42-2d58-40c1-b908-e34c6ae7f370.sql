-- تعطيل trigger إرسال التقييم التلقائي لأن الكود في Orders.tsx يتولى هذه المهمة الآن
DROP TRIGGER IF EXISTS trg_send_eval_on_complete ON public.orders;
DROP TRIGGER IF EXISTS trg_send_evaluation_on_order_complete ON public.orders;