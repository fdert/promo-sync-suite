-- تصحيح إعدادات أمان كلمات المرور
UPDATE auth.config 
SET password_min_length = 8,
    password_require_letters = true,
    password_require_numbers = true,
    password_require_symbols = false,
    password_require_uppercase = false;

-- تقليل فترة انتهاء OTP إلى 10 دقائق (600 ثانية)
UPDATE auth.config 
SET email_confirm_url_ttl = 600,
    magic_link_url_ttl = 600;