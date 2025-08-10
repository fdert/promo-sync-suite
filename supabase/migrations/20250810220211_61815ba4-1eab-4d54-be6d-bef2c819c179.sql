-- إنشاء جدول الباقات
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  description_ar TEXT,
  price DECIMAL(10,2) NOT NULL,
  billing_period TEXT NOT NULL DEFAULT 'monthly', -- monthly, yearly
  max_agencies INTEGER NOT NULL DEFAULT 1,
  max_users_per_agency INTEGER NOT NULL DEFAULT 5,
  max_customers_per_agency INTEGER NOT NULL DEFAULT 100,
  max_orders_per_month INTEGER NOT NULL DEFAULT 50,
  max_storage_gb INTEGER NOT NULL DEFAULT 1,
  features JSONB DEFAULT '[]'::jsonb,
  features_ar JSONB DEFAULT '[]'::jsonb,
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول الاشتراكات
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, expired, pending
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول معاملات الدفع
CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id),
  agency_id UUID REFERENCES public.agencies(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'SAR',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  stripe_payment_intent_id TEXT,
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- تمكين RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- سياسات الباقات (الجميع يمكنه رؤية الباقات النشطة)
CREATE POLICY "الجميع يمكنه رؤية الباقات النشطة" 
ON public.subscription_plans 
FOR SELECT 
USING (is_active = true);

-- سياسات الاشتراكات (الوكالات يمكنها رؤية اشتراكاتها فقط)
CREATE POLICY "الوكالات يمكنها رؤية اشتراكاتها" 
ON public.subscriptions 
FOR SELECT 
USING (agency_id = get_current_user_agency());

CREATE POLICY "إنشاء اشتراكات جديدة" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (agency_id = get_current_user_agency());

-- سياسات المعاملات (الوكالات يمكنها رؤية معاملاتها فقط)
CREATE POLICY "الوكالات يمكنها رؤية معاملاتها" 
ON public.payment_transactions 
FOR SELECT 
USING (agency_id = get_current_user_agency());

CREATE POLICY "إنشاء معاملات جديدة" 
ON public.payment_transactions 
FOR INSERT 
WITH CHECK (true);

-- إدراج باقات افتراضية
INSERT INTO public.subscription_plans (
  name, name_ar, description, description_ar, 
  price, billing_period, max_agencies, max_users_per_agency, 
  max_customers_per_agency, max_orders_per_month, max_storage_gb,
  features, features_ar, is_popular, sort_order
) VALUES 
(
  'Starter', 'الباقة التجريبية',
  'Perfect for small agencies just getting started', 
  'مثالية للوكالات الصغيرة التي تبدأ للتو',
  99.00, 'monthly', 1, 3, 50, 25, 1,
  '["Basic Dashboard", "Customer Management", "Order Tracking", "Email Support"]'::jsonb,
  '["لوحة تحكم أساسية", "إدارة العملاء", "تتبع الطلبات", "دعم عبر البريد الإلكتروني"]'::jsonb,
  false, 1
),
(
  'Professional', 'الباقة الاحترافية',
  'Ideal for growing agencies with advanced needs', 
  'مثالية للوكالات النامية ذات الاحتياجات المتقدمة',
  299.00, 'monthly', 1, 10, 500, 200, 5,
  '["Advanced Dashboard", "Unlimited Customers", "Advanced Analytics", "WhatsApp Integration", "Invoice Management", "Priority Support"]'::jsonb,
  '["لوحة تحكم متقدمة", "عملاء غير محدودين", "تحليلات متقدمة", "تكامل واتساب", "إدارة الفواتير", "دعم ذو أولوية"]'::jsonb,
  true, 2
),
(
  'Enterprise', 'باقة المؤسسات',
  'Complete solution for large agencies and enterprises', 
  'حل متكامل للوكالات الكبيرة والمؤسسات',
  799.00, 'monthly', 5, 50, 2000, 1000, 20,
  '["Multi-Agency Management", "Unlimited Everything", "Custom Integrations", "API Access", "White Label", "24/7 Support", "Custom Training"]'::jsonb,
  '["إدارة متعددة الوكالات", "لا محدود في كل شيء", "تكاملات مخصصة", "وصول API", "علامة تجارية مخصصة", "دعم 24/7", "تدريب مخصص"]'::jsonb,
  false, 3
);

-- إنشاء فهارس للأداء
CREATE INDEX idx_subscriptions_agency_id ON public.subscriptions(agency_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_payment_transactions_subscription_id ON public.payment_transactions(subscription_id);
CREATE INDEX idx_subscription_plans_active ON public.subscription_plans(is_active, sort_order);