-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('print_files', 'print_files', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('order-attachments', 'order-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for print_files bucket
CREATE POLICY "Authenticated can view print_files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'print_files');

CREATE POLICY "Authenticated can upload print_files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'print_files');

CREATE POLICY "Authenticated can update print_files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'print_files');

CREATE POLICY "Authenticated can delete print_files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'print_files');

-- Policies for order-attachments bucket
CREATE POLICY "Authenticated can view order-attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'order-attachments');

CREATE POLICY "Authenticated can upload order-attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'order-attachments');

CREATE POLICY "Authenticated can update order-attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'order-attachments');

CREATE POLICY "Authenticated can delete order-attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'order-attachments');

-- Create invoice number sequence
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq;

-- Create generate_invoice_number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  seq BIGINT;
  new_number TEXT;
BEGIN
  -- Get next sequence value
  SELECT nextval('public.invoice_number_seq') INTO seq;

  -- Build invoice number like INV-YYYYMMDD-00001
  new_number := 'INV-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad(seq::text, 5, '0');

  RETURN new_number;
END;
$$;