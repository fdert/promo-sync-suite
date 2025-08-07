-- تحديث اسم الشركة في قاعدة البيانات
UPDATE website_settings 
SET setting_value = jsonb_set(
  setting_value, 
  '{companyInfo,name}', 
  '"وكالة الابداع والاحتراف للدعاية والاعلان"'
)
WHERE setting_key = 'website_content';