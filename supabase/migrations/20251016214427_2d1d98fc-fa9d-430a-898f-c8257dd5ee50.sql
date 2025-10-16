-- إنشاء جدول إعدادات نظام الولاء
CREATE TABLE IF NOT EXISTS public.loyalty_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  points_per_currency numeric NOT NULL DEFAULT 1,
  currency_per_point numeric NOT NULL DEFAULT 1,
  min_points_to_redeem integer NOT NULL DEFAULT 100,
  points_expiry_days integer DEFAULT NULL,
  is_active boolean DEFAULT true,
  welcome_points integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- إنشاء جدول رصيد نقاط العملاء
CREATE TABLE IF NOT EXISTS public.customer_loyalty_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  total_points integer NOT NULL DEFAULT 0,
  lifetime_points integer NOT NULL DEFAULT 0,
  redeemed_points integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(customer_id)
);

-- إنشاء نوع التعداد لأنواع معاملات الولاء
CREATE TYPE public.loyalty_transaction_type AS ENUM (
  'earn',
  'redeem',
  'expire',
  'adjustment',
  'welcome_bonus'
);

-- إنشاء جدول معاملات نقاط الولاء
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  transaction_type loyalty_transaction_type NOT NULL,
  points integer NOT NULL,
  balance_after integer NOT NULL,
  description text,
  reference_id uuid,
  reference_type text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- تفعيل RLS على جميع الجداول
ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- سياسات RLS لإعدادات الولاء
CREATE POLICY "Authenticated users can view loyalty settings"
  ON public.loyalty_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage loyalty settings"
  ON public.loyalty_settings FOR ALL
  TO authenticated
  USING (true);

-- سياسات RLS لنقاط العملاء
CREATE POLICY "Authenticated users can view customer loyalty points"
  ON public.customer_loyalty_points FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage customer loyalty points"
  ON public.customer_loyalty_points FOR ALL
  TO authenticated
  USING (true);

-- سياسات RLS لمعاملات الولاء
CREATE POLICY "Authenticated users can view loyalty transactions"
  ON public.loyalty_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert loyalty transactions"
  ON public.loyalty_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- إنشاء trigger لتحديث updated_at
CREATE TRIGGER update_loyalty_settings_updated_at
  BEFORE UPDATE ON public.loyalty_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_loyalty_points_updated_at
  BEFORE UPDATE ON public.customer_loyalty_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- إدخال إعدادات افتراضية
INSERT INTO public.loyalty_settings (
  points_per_currency,
  currency_per_point,
  min_points_to_redeem,
  points_expiry_days,
  is_active,
  welcome_points
) VALUES (
  1,
  0.1,
  100,
  365,
  true,
  50
) ON CONFLICT DO NOTHING;

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_points_customer_id 
  ON public.customer_loyalty_points(customer_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer_id 
  ON public.loyalty_transactions(customer_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created_at 
  ON public.loyalty_transactions(created_at DESC);