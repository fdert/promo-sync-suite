-- إصلاح مشكلة المستخدم الافتراضي
-- إضافة القيم المطلوبة للحقول التي لا يمكن أن تكون NULL
UPDATE auth.users 
SET 
  email_change = '',
  email_change_token_current = '',
  email_change_token_new = '',
  email_change_sent_at = NULL,
  email_change_confirm_status = 0,
  banned_until = NULL,
  recovery_sent_at = NULL,
  phone = NULL,
  phone_change = '',
  phone_change_token = '',
  phone_change_sent_at = NULL,
  phone_confirmed_at = NULL,
  confirmed_at = now(),
  confirmation_sent_at = now()
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;