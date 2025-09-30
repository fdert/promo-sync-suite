-- Enable required extensions for cron jobs and HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a function to generate database backup
CREATE OR REPLACE FUNCTION public.generate_database_backup()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  backup_data TEXT := '';
  table_record RECORD;
  column_list TEXT;
BEGIN
  -- Add backup header
  backup_data := '-- Database Backup Generated: ' || NOW() || E'\n\n';
  
  -- Loop through all tables in public schema
  FOR table_record IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    -- Get column list for the table
    SELECT string_agg(column_name, ', ')
    INTO column_list
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = table_record.table_name
    ORDER BY ordinal_position;
    
    -- Add table header
    backup_data := backup_data || E'\n-- Table: ' || table_record.table_name || E'\n';
    backup_data := backup_data || 'DROP TABLE IF EXISTS public.' || table_record.table_name || ' CASCADE;' || E'\n';
    
    -- Get CREATE TABLE statement (simplified version)
    backup_data := backup_data || E'\n-- INSERT statements for ' || table_record.table_name || E'\n';
    
    -- Add INSERT statements
    EXECUTE format(
      'SELECT string_agg(''INSERT INTO public.%I (%s) VALUES ('' || 
       quote_literal(t.*) || '');'', E''\n'')
       FROM (SELECT * FROM public.%I LIMIT 1000) t',
      table_record.table_name,
      column_list,
      table_record.table_name
    ) INTO backup_data;
    
  END LOOP;
  
  RETURN backup_data;
END;
$$;

-- Schedule daily backup at 2 AM
SELECT cron.schedule(
  'daily-database-backup',
  '0 2 * * *', -- Every day at 2 AM
  $$
  SELECT
    net.http_post(
      url := 'https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/send-daily-backup',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcnprZnBvd2p1dHlsZWdkY3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MzU5NzIsImV4cCI6MjA3NDQxMTk3Mn0.frZ6OBDDuqbXOmQUydyoLdCnI5n5_WnS96x2qMPNR78"}'::jsonb,
      body := '{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);