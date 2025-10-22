-- تحديث أنواع الحسابات الموجودة وإضافة الحسابات الأساسية المفقودة

-- أولاً: تحديث الحسابات الموجودة
UPDATE public.accounts SET account_type = 'نقدية' WHERE account_name IN ('نقدية', 'النقدية', 'النقديه', 'كاش') AND is_active = true;
UPDATE public.accounts SET account_type = 'بنك' WHERE account_name IN ('بنك', 'البنك', 'التحويل البنكي') AND is_active = true;
UPDATE public.accounts SET account_type = 'الشبكة' WHERE account_name = 'الشبكة' AND is_active = true;
UPDATE public.accounts SET account_type = 'ذمم مدينة' WHERE account_name = 'ذمم مدينة' AND is_active = true;
UPDATE public.accounts SET account_type = 'مصروفات' WHERE account_name IN ('مصروفات', 'المصروفات') AND is_active = true;

-- التأكد من وجود الحسابات الأساسية
-- حساب نقدية
INSERT INTO public.accounts (account_number, account_name, account_type, balance, is_active)
VALUES ('1001', 'الصندوق النقدي', 'نقدية', 0, true)
ON CONFLICT DO NOTHING;

-- حساب بنك
INSERT INTO public.accounts (account_number, account_name, account_type, balance, is_active)
VALUES ('1002', 'البنك', 'بنك', 0, true)
ON CONFLICT DO NOTHING;

-- حساب الشبكة
INSERT INTO public.accounts (account_number, account_name, account_type, balance, is_active)
VALUES ('1003', 'مدفوعات الشبكة', 'الشبكة', 0, true)
ON CONFLICT DO NOTHING;

-- حساب ذمم مدينة (العملاء)
INSERT INTO public.accounts (account_number, account_name, account_type, balance, is_active)
VALUES ('2001', 'ذمم العملاء المدينة', 'ذمم مدينة', 0, true)
ON CONFLICT DO NOTHING;

-- حساب مصروفات عامة
INSERT INTO public.accounts (account_number, account_name, account_type, balance, is_active)
VALUES ('5001', 'مصروفات عامة', 'مصروفات', 0, true)
ON CONFLICT DO NOTHING;

-- حساب إيرادات
INSERT INTO public.accounts (account_number, account_name, account_type, balance, is_active)
VALUES ('4001', 'إيرادات المبيعات', 'إيرادات', 0, true)
ON CONFLICT DO NOTHING;