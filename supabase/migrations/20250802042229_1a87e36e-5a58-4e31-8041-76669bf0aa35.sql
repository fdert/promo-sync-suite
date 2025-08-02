-- Create bucket for print files
INSERT INTO storage.buckets (id, name, public) VALUES ('print-files', 'print-files', true);

-- Create policies for print files bucket
CREATE POLICY "Allow authenticated users to upload print files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'print-files' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view print files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'print-files' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update print files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'print-files' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete print files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'print-files' AND auth.role() = 'authenticated');