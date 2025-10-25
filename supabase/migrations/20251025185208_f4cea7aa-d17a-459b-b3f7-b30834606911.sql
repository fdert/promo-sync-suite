-- Ensure trigger to send evaluation WhatsApp on order completion exists
-- Drop if exists for idempotency
DROP TRIGGER IF EXISTS trg_send_evaluation_on_order_complete ON public.orders;

-- Create trigger to run after any update; function itself checks status transition to 'مكتمل'
CREATE TRIGGER trg_send_evaluation_on_order_complete
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.send_evaluation_on_order_complete();

-- Optional: small hint comment in database for maintainers
COMMENT ON TRIGGER trg_send_evaluation_on_order_complete ON public.orders IS 'Enqueues WhatsApp evaluation message when order status becomes مكتمل';