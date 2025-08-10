-- إنشاء السجلات المفقودة في جدول website_settings
INSERT INTO public.website_settings (setting_key, setting_value, created_by) VALUES 
('hero_section', '{
  "title": "نظام إدارة الوكالات الشامل",
  "subtitle": "حلول تقنية متقدمة",
  "description": "نظام شامل لإدارة عمليات الوكالات الإعلانية والتسويقية مع أدوات متطورة لإدارة العملاء والمشاريع والفواتير",
  "cta_text": "ابدأ تجربتك المجانية",
  "video_url": ""
}', '336f6e48-78c8-4bd3-975d-ad3e3f41afdd'),

('features_section', '{
  "title": "مميزات النظام",
  "subtitle": "كل ما تحتاجه لإدارة وكالتك بكفاءة",
  "features": [
    {
      "icon": "Users",
      "title": "إدارة العملاء",
      "description": "نظام شامل لإدارة بيانات العملاء ومتابعة تفاعلهم"
    },
    {
      "icon": "FileText",
      "title": "إدارة المشاريع",
      "description": "تتبع المشاريع من البداية حتى التسليم مع تقارير مفصلة"
    },
    {
      "icon": "DollarSign",
      "title": "إدارة الفواتير",
      "description": "إنشاء وإرسال الفواتير بسهولة مع متابعة المدفوعات"
    },
    {
      "icon": "BarChart",
      "title": "التقارير والإحصائيات",
      "description": "تقارير مالية وإحصائية شاملة لمساعدتك في اتخاذ القرارات"
    }
  ]
}', '336f6e48-78c8-4bd3-975d-ad3e3f41afdd'),

('steps_section', '{
  "title": "كيفية الاشتراك",
  "subtitle": "خطوات بسيطة للبدء في استخدام النظام",
  "steps": [
    {
      "number": "1",
      "title": "إنشاء الحساب",
      "description": "سجل بياناتك الأساسية وأنشئ حساب جديد في النظام"
    },
    {
      "number": "2", 
      "title": "اختيار الباقة",
      "description": "اختر الباقة التي تناسب احتياجات وكالتك"
    },
    {
      "number": "3",
      "title": "إعداد النظام",
      "description": "قم بإعداد النظام وإضافة بيانات وكالتك"
    },
    {
      "number": "4",
      "title": "البدء في الاستخدام",
      "description": "ابدأ في إدارة عملائك ومشاريعك بكفاءة"
    }
  ]
}', '336f6e48-78c8-4bd3-975d-ad3e3f41afdd'),

('faq_section', '{
  "title": "الأسئلة الشائعة",
  "subtitle": "إجابات للأسئلة الأكثر شيوعاً",
  "faqs": [
    {
      "question": "هل يمكنني تجربة النظام مجاناً؟",
      "answer": "نعم، نوفر فترة تجريبية مجانية لمدة 14 يوم بجميع المميزات"
    },
    {
      "question": "هل يدعم النظام اللغة العربية؟",
      "answer": "نعم، النظام مصمم خصيصاً للأسواق العربية ويدعم اللغة العربية بالكامل"
    },
    {
      "question": "كم عدد المستخدمين المسموح؟",
      "answer": "يختلف العدد حسب الباقة المختارة، من 5 مستخدمين في الباقة الأساسية إلى عدد غير محدود في الباقة المتقدمة"
    },
    {
      "question": "هل البيانات آمنة؟",
      "answer": "نعم، نستخدم أحدث تقنيات الأمان والتشفير لحماية بياناتك"
    }
  ]
}', '336f6e48-78c8-4bd3-975d-ad3e3f41afdd'),

('contact_section', '{
  "title": "تواصل معنا",
  "subtitle": "نحن هنا لمساعدتك",
  "phone": "+966 50 123 4567",
  "email": "info@agency-system.com",
  "address": "الرياض، المملكة العربية السعودية"
}', '336f6e48-78c8-4bd3-975d-ad3e3f41afdd'),

('company_info', '{
  "name": "نظام إدارة الوكالات",
  "logo_url": "/logo.png",
  "description": "نظام شامل لإدارة عمليات الوكالات الإعلانية والتسويقية",
  "social_links": {
    "facebook": "https://facebook.com/agency-system",
    "twitter": "https://twitter.com/agency-system",
    "linkedin": "https://linkedin.com/company/agency-system",
    "instagram": "https://instagram.com/agency-system"
  }
}', '336f6e48-78c8-4bd3-975d-ad3e3f41afdd')

ON CONFLICT (setting_key) DO NOTHING;