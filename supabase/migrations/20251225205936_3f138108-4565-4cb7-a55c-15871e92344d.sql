-- Create order_consumables table
CREATE TABLE IF NOT EXISTS public.order_consumables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  material_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create order_obstacles table
CREATE TABLE IF NOT EXISTS public.order_obstacles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  obstacle_type TEXT NOT NULL,
  description TEXT NOT NULL,
  customer_notified BOOLEAN NOT NULL DEFAULT false,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.order_consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_obstacles ENABLE ROW LEVEL SECURITY;

-- Create policies for order_consumables
CREATE POLICY "Authenticated users can view order consumables"
  ON public.order_consumables FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage order consumables"
  ON public.order_consumables FOR ALL
  USING (true);

-- Create policies for order_obstacles
CREATE POLICY "Authenticated users can view order obstacles"
  ON public.order_obstacles FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage order obstacles"
  ON public.order_obstacles FOR ALL
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_consumables_order_id ON public.order_consumables(order_id);
CREATE INDEX IF NOT EXISTS idx_order_obstacles_order_id ON public.order_obstacles(order_id);

-- Add message template for obstacles notification
INSERT INTO public.message_templates (name, content, variables, is_active)
VALUES (
  'order_obstacles_notification',
  '⚠️ تنبيه بخصوص طلبك رقم: {{order_number}}

عزيزنا العميل،

نود إعلامكم بوجود بعض الملاحظات التي قد تؤثر على موعد تسليم طلبكم:

{{obstacles_list}}

نرجو التواصل معنا لحل هذه الأمور في أقرب وقت ممكن لضمان تسليم طلبكم في الموعد المحدد.

شكراً لتفهمكم وتعاونكم 🙏',
  '["order_number", "obstacles_list"]',
  true
) ON CONFLICT DO NOTHING;