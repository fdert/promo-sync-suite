-- إنشاء جداول الحملات الجماعية ومجموعات العملاء

-- جدول مجموعات العملاء
CREATE TABLE IF NOT EXISTS public.customer_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- جدول عضوية العملاء في المجموعات
CREATE TABLE IF NOT EXISTS public.customer_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.customer_groups(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(group_id, customer_id)
);

-- جدول الحملات الجماعية
CREATE TABLE IF NOT EXISTS public.bulk_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    message_content TEXT NOT NULL,
    target_type TEXT CHECK (target_type IN ('all', 'groups')) DEFAULT 'all',
    target_groups UUID[] DEFAULT '{}',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    status TEXT CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed', 'paused')) DEFAULT 'draft',
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    delay_between_messages INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- جدول تفاصيل إرسال رسائل الحملة
CREATE TABLE IF NOT EXISTS public.bulk_campaign_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.bulk_campaigns(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id),
    whatsapp_number TEXT NOT NULL,
    message_content TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'sent', 'failed', 'delivered')) DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_campaign_messages ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لمجموعات العملاء
CREATE POLICY "المدراء والموظفون يمكنهم إدارة المجموعات"
ON public.customer_groups
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "المدراء والموظفون يمكنهم إدارة عضوية المجموعات"
ON public.customer_group_members
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

-- سياسات الأمان للحملات الجماعية
CREATE POLICY "المدراء والموظفون يمكنهم إدارة الحملات"
ON public.bulk_campaigns
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "المدراء والموظفون يمكنهم رؤية رسائل الحملات"
ON public.bulk_campaign_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "النظام يمكنه إضافة رسائل الحملات"
ON public.bulk_campaign_messages
FOR INSERT
WITH CHECK (true);

CREATE POLICY "النظام يمكنه تحديث رسائل الحملات"
ON public.bulk_campaign_messages
FOR UPDATE
USING (true);

-- إنشاء دالة لحساب عدد أعضاء المجموعة
CREATE OR REPLACE FUNCTION get_group_member_count(group_id_param UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM customer_group_members 
  WHERE group_id = group_id_param;
$$;

-- إنشاء دالة لإرسال الحملات الجماعية
CREATE OR REPLACE FUNCTION process_bulk_campaign(campaign_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    campaign_record RECORD;
    customer_record RECORD;
    message_count INTEGER := 0;
BEGIN
    -- جلب بيانات الحملة
    SELECT * INTO campaign_record
    FROM bulk_campaigns 
    WHERE id = campaign_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campaign not found';
    END IF;
    
    -- تحديث حالة الحملة إلى "sending"
    UPDATE bulk_campaigns 
    SET status = 'sending', started_at = now()
    WHERE id = campaign_id_param;
    
    -- إضافة رسائل للعملاء حسب نوع الاستهداف
    IF campaign_record.target_type = 'all' THEN
        -- إضافة رسائل لجميع العملاء
        INSERT INTO bulk_campaign_messages (
            campaign_id, customer_id, whatsapp_number, message_content
        )
        SELECT 
            campaign_id_param,
            c.id,
            COALESCE(c.whatsapp_number, c.phone),
            REPLACE(REPLACE(
                campaign_record.message_content, 
                '{{customer_name}}', c.name
            ), '{{date}}', TO_CHAR(now(), 'DD/MM/YYYY'))
        FROM customers c
        WHERE COALESCE(c.whatsapp_number, c.phone) IS NOT NULL 
        AND COALESCE(c.whatsapp_number, c.phone) != '';
        
    ELSE
        -- إضافة رسائل للمجموعات المحددة
        INSERT INTO bulk_campaign_messages (
            campaign_id, customer_id, whatsapp_number, message_content
        )
        SELECT 
            campaign_id_param,
            c.id,
            COALESCE(c.whatsapp_number, c.phone),
            REPLACE(REPLACE(
                campaign_record.message_content, 
                '{{customer_name}}', c.name
            ), '{{date}}', TO_CHAR(now(), 'DD/MM/YYYY'))
        FROM customers c
        JOIN customer_group_members cgm ON c.id = cgm.customer_id
        WHERE cgm.group_id = ANY(campaign_record.target_groups)
        AND COALESCE(c.whatsapp_number, c.phone) IS NOT NULL 
        AND COALESCE(c.whatsapp_number, c.phone) != '';
    END IF;
    
    -- حساب العدد الإجمالي للمستلمين
    GET DIAGNOSTICS message_count = ROW_COUNT;
    
    -- تحديث عدد المستلمين
    UPDATE bulk_campaigns 
    SET total_recipients = message_count
    WHERE id = campaign_id_param;
    
    -- تحديث حالة الحملة إلى completed إذا لم توجد رسائل
    IF message_count = 0 THEN
        UPDATE bulk_campaigns 
        SET status = 'completed', completed_at = now()
        WHERE id = campaign_id_param;
    END IF;
END;
$$;