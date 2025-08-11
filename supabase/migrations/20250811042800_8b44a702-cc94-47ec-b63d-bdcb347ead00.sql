-- إنشاء أو تحديث دور الأدمن للمستخدم الحالي
-- بافتراض أن المستخدم سيكون مسجل دخوله عند تشغيل هذا

DO $$
DECLARE
    current_user_id UUID;
BEGIN
    -- إذا كان هناك مستخدم مسجل دخوله، احصل على معرفه
    current_user_id := auth.uid();
    
    -- إذا لم يكن هناك مستخدم مسجل دخوله، ابحث عن أي مستخدم موجود في قاعدة البيانات
    IF current_user_id IS NULL THEN
        SELECT id INTO current_user_id
        FROM auth.users 
        ORDER BY created_at DESC 
        LIMIT 1;
    END IF;
    
    -- التأكد من وجود مستخدم للعمل معه
    IF current_user_id IS NOT NULL THEN
        -- حذف أي أدوار موجودة لهذا المستخدم
        DELETE FROM public.user_roles 
        WHERE user_id = current_user_id;
        
        -- إضافة دور الأدمن
        INSERT INTO public.user_roles (user_id, role)
        VALUES (current_user_id, 'admin');
        
        RAISE NOTICE 'تم إضافة دور الأدمن للمستخدم: %', current_user_id;
    ELSE
        RAISE NOTICE 'لم يتم العثور على أي مستخدم في النظام';
    END IF;
END $$;