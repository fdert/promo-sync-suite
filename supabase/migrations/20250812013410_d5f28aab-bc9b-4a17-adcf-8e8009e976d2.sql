-- إنشاء وكالة افتراضية إذا لم تكن موجودة وربط البيانات المفقودة
DO $$
DECLARE
    default_agency_id UUID;
    admin_user_id UUID;
BEGIN
    -- البحث عن أول مدير في النظام
    SELECT ur.user_id INTO admin_user_id
    FROM user_roles ur
    WHERE ur.role = 'admin'
    LIMIT 1;
    
    -- البحث عن الوكالة الافتراضية
    SELECT id INTO default_agency_id
    FROM agencies
    WHERE slug = 'default-agency'
    LIMIT 1;
    
    -- إنشاء وكالة افتراضية إذا لم تكن موجودة
    IF default_agency_id IS NULL THEN
        INSERT INTO agencies (
            name, 
            slug, 
            contact_email,
            created_by,
            is_active
        ) VALUES (
            'الوكالة الافتراضية',
            'default-agency',
            'admin@default-agency.com',
            admin_user_id,
            true
        )
        RETURNING id INTO default_agency_id;
    END IF;
    
    -- إضافة جميع المدراء والموظفين للوكالة الافتراضية إذا لم يكونوا أعضاء في وكالة
    INSERT INTO agency_members (agency_id, user_id, role, created_by)
    SELECT 
        default_agency_id,
        ur.user_id,
        CASE 
            WHEN ur.role = 'admin' THEN 'owner'
            WHEN ur.role = 'manager' THEN 'admin'
            WHEN ur.role = 'employee' THEN 'employee'
            ELSE 'member'
        END,
        admin_user_id
    FROM user_roles ur
    WHERE NOT EXISTS (
        SELECT 1 FROM agency_members am 
        WHERE am.user_id = ur.user_id AND am.is_active = true
    )
    ON CONFLICT (agency_id, user_id) DO NOTHING;
    
    -- ربط البيانات المفقودة بالوكالة الافتراضية
    UPDATE customers SET agency_id = default_agency_id WHERE agency_id IS NULL;
    UPDATE orders SET agency_id = default_agency_id WHERE agency_id IS NULL;
    UPDATE invoices SET agency_id = default_agency_id WHERE agency_id IS NULL;
    UPDATE payments SET agency_id = default_agency_id WHERE agency_id IS NULL;
    UPDATE services SET agency_id = default_agency_id WHERE agency_id IS NULL;
    UPDATE accounts SET agency_id = default_agency_id WHERE agency_id IS NULL;
    UPDATE account_entries SET agency_id = default_agency_id WHERE agency_id IS NULL;
    UPDATE expenses SET agency_id = default_agency_id WHERE agency_id IS NULL;
    UPDATE evaluations SET agency_id = default_agency_id WHERE agency_id IS NULL;
    UPDATE whatsapp_messages SET agency_id = default_agency_id WHERE agency_id IS NULL;
    UPDATE customer_groups SET agency_id = default_agency_id WHERE agency_id IS NULL;
    UPDATE bulk_campaigns SET agency_id = default_agency_id WHERE agency_id IS NULL;
    
    RAISE NOTICE 'تم ربط البيانات بالوكالة الافتراضية: %', default_agency_id;
END $$;