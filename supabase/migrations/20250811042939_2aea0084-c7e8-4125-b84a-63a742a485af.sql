-- إضافة دور الأدمن للمستخدم صاحب البريد الإلكتروني ibdaa.adve@gmail.com

DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- البحث عن المستخدم بالبريد الإلكتروني
    SELECT id INTO target_user_id
    FROM auth.users 
    WHERE email = 'ibdaa.adve@gmail.com';
    
    IF target_user_id IS NOT NULL THEN
        -- حذف أي أدوار موجودة لهذا المستخدم
        DELETE FROM public.user_roles 
        WHERE user_id = target_user_id;
        
        -- إضافة دور الأدمن
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'admin');
        
        RAISE NOTICE 'تم إضافة دور الأدمن للمستخدم: % (البريد: %)', target_user_id, 'ibdaa.adve@gmail.com';
    ELSE
        RAISE NOTICE 'لم يتم العثور على مستخدم بالبريد الإلكتروني: %', 'ibdaa.adve@gmail.com';
    END IF;
END $$;