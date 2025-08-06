-- إضافة حقول جديدة لجدول التقييمات للربط مع خرائط جوجل
ALTER TABLE evaluations 
ADD COLUMN google_review_status text DEFAULT 'pending' CHECK (google_review_status IN ('pending', 'approved', 'sent_to_customer', 'published_by_customer', 'declined')),
ADD COLUMN google_review_sent_at timestamp with time zone,
ADD COLUMN google_review_link text,
ADD COLUMN admin_notes text,
ADD COLUMN approved_by uuid,
ADD COLUMN approved_at timestamp with time zone;

-- إنشاء جدول إعدادات خرائط جوجل
CREATE TABLE google_maps_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id text NOT NULL,
  business_name text NOT NULL,
  google_maps_url text NOT NULL,
  review_template text DEFAULT 'نرجو منك تقييم تجربتك معنا على خرائط جوجل من خلال الرابط التالي:',
  auto_send_enabled boolean DEFAULT false,
  minimum_rating integer DEFAULT 4 CHECK (minimum_rating >= 1 AND minimum_rating <= 5),
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- تمكين RLS على الجدول الجديد
ALTER TABLE google_maps_settings ENABLE ROW LEVEL SECURITY;

-- سياسة الأمان للمدراء فقط
CREATE POLICY "المدراء يمكنهم إدارة إعدادات خرائط جوجل"
ON google_maps_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- إنشاء جدول سجل طلبات المراجعة
CREATE TABLE google_review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid REFERENCES evaluations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id),
  review_link text NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  clicked_at timestamp with time zone,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'clicked', 'completed', 'expired')),
  expires_at timestamp with time zone DEFAULT (now() + interval '30 days'),
  created_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- تمكين RLS على جدول طلبات المراجعة
ALTER TABLE google_review_requests ENABLE ROW LEVEL SECURITY;

-- سياسة الأمان لجدول طلبات المراجعة
CREATE POLICY "المدراء والموظفون يمكنهم رؤية طلبات المراجعة"
ON google_review_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

-- دالة لإنشاء رابط مراجعة جوجل
CREATE OR REPLACE FUNCTION generate_google_review_link(place_id text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'https://search.google.com/local/writereview?placeid=' || place_id;
END;
$$;

-- تحديث إحصائيات التقييمات لتشمل معلومات خرائط جوجل
ALTER TABLE evaluation_stats
ADD COLUMN google_reviews_sent integer DEFAULT 0,
ADD COLUMN google_reviews_completed integer DEFAULT 0,
ADD COLUMN google_review_conversion_rate numeric DEFAULT 0;