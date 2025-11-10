-- إنشاء bucket للتقارير إذا لم يكن موجوداً
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports',
  'reports',
  false,
  52428800,
  ARRAY['application/pdf', 'text/html', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

-- سياسة للسماح بالقراءة للمستخدمين المصادق عليهم
DROP POLICY IF EXISTS "Authenticated users can view reports" ON storage.objects;
CREATE POLICY "Authenticated users can view reports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'reports');

-- سياسة للسماح بالرفع من خلال service role فقط
DROP POLICY IF EXISTS "Service role can upload reports" ON storage.objects;
CREATE POLICY "Service role can upload reports"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'reports');

-- جدولة التقرير اليومي عند الساعة 23:45
SELECT cron.schedule(
  'generate-daily-tasks-pdf-report',
  '45 23 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/generate-daily-tasks-pdf',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcnprZnBvd2p1dHlsZWdkY3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MzU5NzIsImV4cCI6MjA3NDQxMTk3Mn0.frZ6OBDDuqbXOmQUydyoLdCnI5n5_WnS96x2qMPNR78"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);