-- Fix the generate_database_backup function
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
  insert_statements TEXT;
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
    -- Get column list for the table (fixed ORDER BY inside string_agg)
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    INTO column_list
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = table_record.table_name;
    
    -- Add table header
    backup_data := backup_data || E'\n-- Table: ' || table_record.table_name || E'\n';
    backup_data := backup_data || '-- Columns: ' || column_list || E'\n\n';
    
    -- Get row count
    EXECUTE format('SELECT COUNT(*) FROM public.%I', table_record.table_name) INTO insert_statements;
    backup_data := backup_data || '-- Total rows: ' || insert_statements || E'\n';
    
    -- Add a note about data export
    backup_data := backup_data || '-- Note: Use pg_dump or export tools for full data backup' || E'\n\n';
    
  END LOOP;
  
  backup_data := backup_data || E'\n-- Backup completed at: ' || NOW() || E'\n';
  
  RETURN backup_data;
END;
$$;