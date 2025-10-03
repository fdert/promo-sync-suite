-- حذف الدالة القديمة وإنشاء دالة جديدة لنسخ احتياطي كامل للبيانات
DROP FUNCTION IF EXISTS public.generate_database_backup();

CREATE OR REPLACE FUNCTION public.generate_database_backup()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  backup_data TEXT := '';
  table_record RECORD;
  row_record RECORD;
  column_record RECORD;
  insert_statement TEXT;
  values_list TEXT;
  column_value TEXT;
  row_count INTEGER := 0;
  max_rows INTEGER := 1000; -- حد أقصى للصفوف لكل جدول
BEGIN
  -- إضافة رأس النسخة الاحتياطية
  backup_data := '-- ============================================' || E'\n';
  backup_data := backup_data || '-- النسخة الاحتياطية لقاعدة البيانات' || E'\n';
  backup_data := backup_data || '-- تاريخ الإنشاء: ' || NOW() || E'\n';
  backup_data := backup_data || '-- ============================================' || E'\n\n';
  
  -- المرور عبر جميع الجداول
  FOR table_record IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name NOT LIKE 'pg_%'
    ORDER BY table_name
  LOOP
    backup_data := backup_data || E'\n-- ============================================\n';
    backup_data := backup_data || '-- الجدول: ' || table_record.table_name || E'\n';
    backup_data := backup_data || '-- ============================================' || E'\n\n';
    
    -- حساب عدد الصفوف
    EXECUTE format('SELECT COUNT(*) FROM public.%I', table_record.table_name) INTO row_count;
    backup_data := backup_data || '-- عدد الصفوف الكلي: ' || row_count || E'\n';
    
    IF row_count > max_rows THEN
      backup_data := backup_data || '-- تنبيه: سيتم نسخ أول ' || max_rows || ' صف فقط' || E'\n';
    END IF;
    
    backup_data := backup_data || E'\n';
    
    -- إذا كان الجدول فارغاً، تخطيه
    IF row_count = 0 THEN
      backup_data := backup_data || '-- الجدول فارغ' || E'\n\n';
      CONTINUE;
    END IF;
    
    -- حذف البيانات القديمة قبل الإدراج (اختياري - يمكن حذف هذا السطر)
    -- backup_data := backup_data || format('DELETE FROM public.%I;', table_record.table_name) || E'\n\n';
    
    -- استخراج البيانات
    row_count := 0;
    FOR row_record IN 
      EXECUTE format('SELECT * FROM public.%I LIMIT %s', table_record.table_name, max_rows)
    LOOP
      row_count := row_count + 1;
      
      -- بناء قائمة الأعمدة
      insert_statement := 'INSERT INTO public.' || table_record.table_name || ' (';
      values_list := '';
      
      FOR column_record IN 
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = table_record.table_name
        ORDER BY ordinal_position
      LOOP
        -- إضافة اسم العمود
        IF values_list != '' THEN
          insert_statement := insert_statement || ', ';
          values_list := values_list || ', ';
        END IF;
        
        insert_statement := insert_statement || column_record.column_name;
        
        -- الحصول على قيمة العمود
        EXECUTE format('SELECT quote_literal($1.%I::text)', column_record.column_name) 
        USING row_record 
        INTO column_value;
        
        -- معالجة القيم الخالية
        IF column_value = 'NULL' OR column_value IS NULL THEN
          values_list := values_list || 'NULL';
        ELSE
          -- إزالة علامات الاقتباس الإضافية إذا كانت موجودة
          IF column_record.data_type IN ('uuid', 'timestamp with time zone', 'timestamp', 'date') THEN
            values_list := values_list || column_value;
          ELSE
            values_list := values_list || column_value;
          END IF;
        END IF;
      END LOOP;
      
      -- إكمال جملة INSERT
      insert_statement := insert_statement || ') VALUES (' || values_list || ');' || E'\n';
      backup_data := backup_data || insert_statement;
      
      -- إضافة فاصل كل 100 صف للقراءة
      IF row_count % 100 = 0 THEN
        backup_data := backup_data || E'\n-- تم معالجة ' || row_count || ' صف...\n\n';
      END IF;
    END LOOP;
    
    backup_data := backup_data || E'\n-- تم نسخ ' || row_count || ' صف من جدول ' || table_record.table_name || E'\n\n';
    
  END LOOP;
  
  backup_data := backup_data || E'\n-- ============================================\n';
  backup_data := backup_data || '-- اكتملت النسخة الاحتياطية بنجاح' || E'\n';
  backup_data := backup_data || '-- الوقت: ' || NOW() || E'\n';
  backup_data := backup_data || '-- ============================================\n';
  
  RETURN backup_data;
EXCEPTION
  WHEN OTHERS THEN
    RETURN '-- خطأ في إنشاء النسخة الاحتياطية: ' || SQLERRM;
END;
$$;