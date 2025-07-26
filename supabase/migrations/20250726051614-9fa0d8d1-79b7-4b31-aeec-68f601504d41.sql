-- إضافة جدول التقييمات
CREATE TABLE IF NOT EXISTS public.evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  service_quality_rating integer CHECK (service_quality_rating >= 1 AND service_quality_rating <= 5),
  delivery_time_rating integer CHECK (delivery_time_rating >= 1 AND delivery_time_rating <= 5),
  communication_rating integer CHECK (communication_rating >= 1 AND communication_rating <= 5),
  price_value_rating integer CHECK (price_value_rating >= 1 AND price_value_rating <= 5),
  feedback_text text,
  suggestions text,
  would_recommend boolean DEFAULT true,
  evaluation_token text UNIQUE NOT NULL,
  submitted_at timestamp with time zone DEFAULT now(),
  is_public boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- تمكين RLS للتقييمات
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- سياسات التقييمات
CREATE POLICY "المدراء والموظفون يمكنهم رؤية جميع التقييمات" 
ON public.evaluations 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "التقييمات العامة يمكن للجميع رؤيتها" 
ON public.evaluations 
FOR SELECT 
USING (is_public = true);

CREATE POLICY "يمكن إنشاء تقييمات جديدة" 
ON public.evaluations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "المدراء يمكنهم تحديث التقييمات" 
ON public.evaluations 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- إضافة trigger للتحديث التلقائي
CREATE TRIGGER update_evaluations_updated_at
BEFORE UPDATE ON public.evaluations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- إضافة جدول إحصائيات التقييمات  
CREATE TABLE IF NOT EXISTS public.evaluation_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total_evaluations integer DEFAULT 0,
  average_rating numeric(3,2) DEFAULT 0,
  five_star_count integer DEFAULT 0,
  four_star_count integer DEFAULT 0,
  three_star_count integer DEFAULT 0,
  two_star_count integer DEFAULT 0,
  one_star_count integer DEFAULT 0,
  recommendation_percentage numeric(5,2) DEFAULT 0,
  service_quality_avg numeric(3,2) DEFAULT 0,
  delivery_time_avg numeric(3,2) DEFAULT 0,
  communication_avg numeric(3,2) DEFAULT 0,
  price_value_avg numeric(3,2) DEFAULT 0,
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- تمكين RLS لإحصائيات التقييمات
ALTER TABLE public.evaluation_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "المدراء يمكنهم إدارة إحصائيات التقييمات" 
ON public.evaluation_stats 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));