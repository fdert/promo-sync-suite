-- Fix search_path for the backup function
CREATE OR REPLACE FUNCTION public.generate_database_backup()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    
    -- Add INSERT statements (limited to 1000 rows per table for safety)
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