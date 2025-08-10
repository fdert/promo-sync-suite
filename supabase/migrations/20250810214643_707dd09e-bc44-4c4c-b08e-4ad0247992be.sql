-- إضافة عمود agency_id للجداول الموجودة لتحقيق العزل بين الوكالات

-- 1. إضافة agency_id للعملاء
ALTER TABLE public.customers 
ADD COLUMN agency_id UUID REFERENCES public.agencies(id);

-- 2. إضافة agency_id للطلبات
ALTER TABLE public.orders 
ADD COLUMN agency_id UUID REFERENCES public.agencies(id);

-- 3. إضافة agency_id للفواتير
ALTER TABLE public.invoices 
ADD COLUMN agency_id UUID REFERENCES public.agencies(id);

-- 4. إضافة agency_id للمدفوعات
ALTER TABLE public.payments 
ADD COLUMN agency_id UUID REFERENCES public.agencies(id);

-- 5. إضافة agency_id للخدمات
ALTER TABLE public.services 
ADD COLUMN agency_id UUID REFERENCES public.agencies(id);

-- 6. إضافة agency_id للحسابات المحاسبية
ALTER TABLE public.accounts 
ADD COLUMN agency_id UUID REFERENCES public.agencies(id);

-- 7. إضافة agency_id للقيود المحاسبية
ALTER TABLE public.account_entries 
ADD COLUMN agency_id UUID REFERENCES public.agencies(id);

-- 8. إضافة agency_id للمصروفات
ALTER TABLE public.expenses 
ADD COLUMN agency_id UUID REFERENCES public.agencies(id);

-- 9. إضافة agency_id للتقييمات
ALTER TABLE public.evaluations 
ADD COLUMN agency_id UUID REFERENCES public.agencies(id);

-- 10. إضافة agency_id لرسائل الواتساب
ALTER TABLE public.whatsapp_messages 
ADD COLUMN agency_id UUID REFERENCES public.agencies(id);

-- 11. إضافة agency_id لمجموعات العملاء
ALTER TABLE public.customer_groups 
ADD COLUMN agency_id UUID REFERENCES public.agencies(id);

-- 12. إضافة agency_id للحملات الجماعية
ALTER TABLE public.bulk_campaigns 
ADD COLUMN agency_id UUID REFERENCES public.agencies(id);

-- 13. إضافة agency_id لطلبات الطباعة إذا وجدت
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'print_orders') THEN
        ALTER TABLE public.print_orders 
        ADD COLUMN agency_id UUID REFERENCES public.agencies(id);
    END IF;
END $$;

-- 14. إضافة agency_id لملفات الطباعة إذا وجدت
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'print_files') THEN
        ALTER TABLE public.print_files 
        ADD COLUMN agency_id UUID REFERENCES public.agencies(id);
    END IF;
END $$;

-- 15. إضافة agency_id لإعدادات الباركود
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'barcode_label_settings') THEN
        ALTER TABLE public.barcode_label_settings 
        ADD COLUMN agency_id UUID REFERENCES public.agencies(id);
    END IF;
END $$;

-- إضافة فهارس للبحث السريع
CREATE INDEX idx_customers_agency_id ON public.customers(agency_id);
CREATE INDEX idx_orders_agency_id ON public.orders(agency_id);
CREATE INDEX idx_invoices_agency_id ON public.invoices(agency_id);
CREATE INDEX idx_payments_agency_id ON public.payments(agency_id);
CREATE INDEX idx_services_agency_id ON public.services(agency_id);
CREATE INDEX idx_accounts_agency_id ON public.accounts(agency_id);
CREATE INDEX idx_expenses_agency_id ON public.expenses(agency_id);

-- دالة لإنشاء وكالة افتراضية ونقل البيانات الموجودة إليها
CREATE OR REPLACE FUNCTION public.migrate_existing_data_to_default_agency()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    default_agency_id UUID;
    admin_user_id UUID;
BEGIN
    -- البحث عن أول مدير في النظام
    SELECT ur.user_id INTO admin_user_id
    FROM user_roles ur
    WHERE ur.role = 'admin'
    LIMIT 1;
    
    -- إنشاء وكالة افتراضية إذا لم تكن موجودة
    INSERT INTO public.agencies (
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
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO default_agency_id;
    
    -- إذا كانت الوكالة موجودة مسبقاً، احصل على معرفها
    IF default_agency_id IS NULL THEN
        SELECT id INTO default_agency_id
        FROM public.agencies
        WHERE slug = 'default-agency';
    END IF;
    
    -- إضافة جميع المدراء والموظفين الحاليين للوكالة الافتراضية
    INSERT INTO public.agency_members (agency_id, user_id, role, created_by)
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
    ON CONFLICT (agency_id, user_id) DO NOTHING;
    
    -- نقل البيانات الموجودة للوكالة الافتراضية
    UPDATE public.customers SET agency_id = default_agency_id WHERE agency_id IS NULL;
    UPDATE public.orders SET agency_id = default_agency_id WHERE agency_id IS NULL;
    UPDATE public.invoices SET agency_id = default_agency_id WHERE agency_id IS NULL;
    UPDATE public.payments SET agency_id = default_agency_id WHERE agency_id IS NULL;
    UPDATE public.services SET agency_id = default_agency_id WHERE agency_id IS NULL;
    UPDATE public.accounts SET agency_id = default_agency_id WHERE agency_id IS NULL;
    UPDATE public.account_entries SET agency_id = default_agency_id WHERE agency_id IS NULL;
    UPDATE public.expenses SET agency_id = default_agency_id WHERE agency_id IS NULL;
    UPDATE public.evaluations SET agency_id = default_agency_id WHERE agency_id IS NULL;
    UPDATE public.whatsapp_messages SET agency_id = default_agency_id WHERE agency_id IS NULL;
    UPDATE public.customer_groups SET agency_id = default_agency_id WHERE agency_id IS NULL;
    UPDATE public.bulk_campaigns SET agency_id = default_agency_id WHERE agency_id IS NULL;
    
    -- نقل بيانات الطباعة إذا وجدت
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'print_orders') THEN
        EXECUTE 'UPDATE public.print_orders SET agency_id = $1 WHERE agency_id IS NULL' USING default_agency_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'print_files') THEN
        EXECUTE 'UPDATE public.print_files SET agency_id = $1 WHERE agency_id IS NULL' USING default_agency_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'barcode_label_settings') THEN
        EXECUTE 'UPDATE public.barcode_label_settings SET agency_id = $1 WHERE agency_id IS NULL' USING default_agency_id;
    END IF;
    
END;
$$;

-- تنفيذ عملية النقل
SELECT public.migrate_existing_data_to_default_agency();