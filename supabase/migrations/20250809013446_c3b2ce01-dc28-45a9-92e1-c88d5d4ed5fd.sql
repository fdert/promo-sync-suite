-- التراجع عن تحديث روابط الويب هوك وإعادتها إلى حالتها السابقة
-- هذا سيعيد كل رابط إلى قيمته الافتراضية حسب النوع

UPDATE webhook_settings 
SET webhook_url = CASE webhook_type
  WHEN 'whatsapp' THEN 'https://your-whatsapp-webhook-url.com'
  WHEN 'bulk_campaign' THEN 'https://your-bulk-campaign-webhook-url.com'
  WHEN 'outgoing' THEN 'https://your-outgoing-webhook-url.com'
  WHEN 'evaluation' THEN 'https://your-evaluation-webhook-url.com'
  WHEN 'invoice' THEN 'https://your-invoice-webhook-url.com'
  WHEN 'proof' THEN 'https://your-proof-webhook-url.com'
  ELSE webhook_url
END
WHERE webhook_url = 'https://n8n.srv894347.hstgr.cloud/webhook-test/ca719409-ac29-485a-99d4-3b602978eace';