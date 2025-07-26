-- Add attachment storage bucket for orders
INSERT INTO storage.buckets (id, name, public) VALUES ('order-attachments', 'order-attachments', false);

-- Create storage policies for order attachments
CREATE POLICY "Users can upload order attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'order-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view order attachments" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'order-attachments' AND (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'employee'::app_role)
));

-- Add new fields to orders table
ALTER TABLE public.orders 
ADD COLUMN attachment_urls text[],
ADD COLUMN paid_amount numeric DEFAULT 0,
ADD COLUMN payment_type text DEFAULT 'دفع آجل',
ADD COLUMN payment_notes text;

-- Create payments table to track payment history
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id),
  invoice_id uuid REFERENCES public.invoices(id),
  amount numeric NOT NULL,
  payment_type text NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payments table
CREATE POLICY "المدراء والموظفون يمكنهم رؤية جميع المدفوعات" 
ON public.payments 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "المدراء والموظفون يمكنهم إضافة مدفوعات" 
ON public.payments 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "المدراء والموظفون يمكنهم تحديث المدفوعات" 
ON public.payments 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "المدراء فقط يمكنهم حذف المدفوعات" 
ON public.payments 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();