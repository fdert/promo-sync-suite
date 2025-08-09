-- إضافة webhook خاص لإرسال التقارير المالية
INSERT INTO webhook_settings (
  webhook_name,
  webhook_url,
  webhook_type,
  is_active,
  order_statuses,
  created_by
) VALUES (
  'واتساب التقارير المالية',
  'https://n8n.srv894347.hstgr.cloud/webhook/3739fd5b-a262-42a8-aaa6-c3c141809937',
  'account_summary',
  true,
  ARRAY['account_summary'],
  (SELECT id FROM auth.users LIMIT 1)
) ON CONFLICT DO NOTHING;