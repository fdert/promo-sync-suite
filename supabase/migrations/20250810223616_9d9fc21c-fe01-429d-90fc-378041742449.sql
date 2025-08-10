-- إنشاء جدول إعدادات محتوى الموقع
CREATE TABLE IF NOT EXISTS public.website_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- تمكين RLS
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

-- سياسة للقراءة - الجميع يمكنهم قراءة إعدادات الموقع
CREATE POLICY "الجميع يمكنهم قراءة إعدادات الموقع"
ON public.website_settings
FOR SELECT
TO authenticated, anon
USING (true);

-- سياسة للإدارة - المدراء فقط يمكنهم تعديل الإعدادات
CREATE POLICY "المدراء يمكنهم إدارة إعدادات الموقع"
ON public.website_settings
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'manager')
    )
);

-- إدراج البيانات الافتراضية لمحتوى صفحة العملاء
INSERT INTO public.website_settings (setting_key, setting_value) VALUES
('hero_section', '{
    "title": "نظام إدارة الوكالات الدعائية والإعلانية",
    "subtitle": "الحل الشامل لإدارة وكالتك بطريقة احترافية ومتقدمة",
    "description": "نظام متكامل يساعدك على إدارة العملاء، الطلبات، الفواتير، والتقارير بكفاءة عالية",
    "cta_text": "ابدأ تجربتك المجانية",
    "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ"
}'::jsonb),

('features_section', '{
    "title": "مميزات النظام",
    "subtitle": "كل ما تحتاجه لإدارة وكالتك في مكان واحد",
    "features": [
        {
            "icon": "Users",
            "title": "إدارة العملاء",
            "description": "قاعدة بيانات شاملة للعملاء مع إمكانية التصنيف والبحث المتقدم"
        },
        {
            "icon": "ClipboardList",
            "title": "إدارة الطلبات",
            "description": "تتبع الطلبات من البداية للنهاية مع نظام تنبيهات ذكي"
        },
        {
            "icon": "FileText",
            "title": "الفواتير والمحاسبة",
            "description": "إصدار فواتير احترافية وتتبع المدفوعات والديون"
        },
        {
            "icon": "MessageSquare",
            "title": "رسائل واتساب",
            "description": "إرسال رسائل تلقائية للعملاء حسب حالة الطلب"
        },
        {
            "icon": "BarChart3",
            "title": "التقارير والإحصائيات",
            "description": "تقارير مفصلة ورؤى تحليلية لأداء وكالتك"
        },
        {
            "icon": "Star",
            "title": "التقييمات",
            "description": "نظام تقييمات العملاء وطلب مراجعات جوجل"
        }
    ]
}'::jsonb),

('steps_section', '{
    "title": "كيفية الاشتراك",
    "subtitle": "خطوات بسيطة للبدء",
    "steps": [
        {
            "number": "1",
            "title": "إنشاء حساب",
            "description": "سجل حسابك مجاناً في أقل من دقيقة"
        },
        {
            "number": "2",
            "title": "اختيار الباقة",
            "description": "اختر الباقة المناسبة لحجم وكالتك"
        },
        {
            "number": "3",
            "title": "إعداد الوكالة",
            "description": "أضف بيانات وكالتك وابدأ إضافة العملاء"
        },
        {
            "number": "4",
            "title": "البدء",
            "description": "ابدأ إدارة طلباتك وعملائك بكفاءة"
        }
    ]
}'::jsonb),

('faq_section', '{
    "title": "الأسئلة الشائعة",
    "faqs": [
        {
            "question": "هل يمكنني تجربة النظام مجاناً؟",
            "answer": "نعم، نوفر فترة تجربة مجانية لمدة 14 يوم بجميع المميزات."
        },
        {
            "question": "هل النظام يدعم اللغة العربية؟",
            "answer": "نعم، النظام مصمم خصيصاً للسوق العربي ويدعم اللغة العربية بالكامل."
        },
        {
            "question": "هل يمكن ربط النظام مع واتساب؟",
            "answer": "نعم، يمكن ربط النظام مع واتساب لإرسال رسائل تلقائية للعملاء."
        },
        {
            "question": "هل البيانات آمنة؟",
            "answer": "نعم، جميع البيانات محفوظة بأعلى معايير الأمان والحماية."
        }
    ]
}'::jsonb),

('contact_section', '{
    "title": "تواصل معنا",
    "subtitle": "نحن هنا لمساعدتك",
    "phone": "+966 50 123 4567",
    "email": "info@agency-system.com",
    "address": "الرياض، المملكة العربية السعودية"
}'::jsonb),

('company_info', '{
    "name": "نظام إدارة الوكالات",
    "logo_url": "/logo.png",
    "description": "الحل الشامل لإدارة وكالات الدعاية والإعلان",
    "social_links": {
        "facebook": "#",
        "twitter": "#", 
        "linkedin": "#",
        "instagram": "#"
    }
}'::jsonb)

ON CONFLICT (setting_key) DO NOTHING;