-- تحديث webhook التقارير المالية لاستخدام webhook الحملات الجماعية
UPDATE webhook_settings 
SET webhook_url = 'https://n8n.srv894347.hstgr.cloud/webhook-test/ca719409-ac29-485a-99d4-3b602978eace',
    updated_at = now()
WHERE webhook_type = 'account_summary' 
AND webhook_name = 'واتساب التقارير المالية';