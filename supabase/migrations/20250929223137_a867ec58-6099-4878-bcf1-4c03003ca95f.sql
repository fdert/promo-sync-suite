-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE public.app_role AS ENUM ('admin', 'employee', 'user');
CREATE TYPE public.payment_type AS ENUM ('cash', 'card', 'bank_transfer', 'check', 'other');
CREATE TYPE public.order_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'cancelled');
CREATE TYPE public.message_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');
CREATE TYPE public.campaign_status AS ENUM ('draft', 'scheduled', 'processing', 'completed', 'failed');

-- ============================================
-- User Management Tables
-- ============================================

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

-- User permissions table
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, permission)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view permissions"
  ON public.user_permissions FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- Customer Management Tables
-- ============================================

-- Customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  area TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (true);

-- Customer groups table
CREATE TABLE public.customer_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.customer_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customer groups"
  ON public.customer_groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage customer groups"
  ON public.customer_groups FOR ALL
  TO authenticated
  USING (true);

-- Customer group members table
CREATE TABLE public.customer_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES public.customer_groups(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, customer_id)
);

ALTER TABLE public.customer_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view group members"
  ON public.customer_group_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage group members"
  ON public.customer_group_members FOR ALL
  TO authenticated
  USING (true);

-- ============================================
-- Service Types Table
-- ============================================

CREATE TABLE public.service_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view service types"
  ON public.service_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage service types"
  ON public.service_types FOR ALL
  TO authenticated
  USING (true);

-- ============================================
-- Orders and Items Tables
-- ============================================

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  service_type_id UUID REFERENCES public.service_types(id) ON DELETE SET NULL,
  status order_status DEFAULT 'pending',
  total_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  notes TEXT,
  delivery_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage orders"
  ON public.orders FOR ALL
  TO authenticated
  USING (true);

-- Order items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage order items"
  ON public.order_items FOR ALL
  TO authenticated
  USING (true);

-- ============================================
-- Invoices Tables
-- ============================================

-- Invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  status invoice_status DEFAULT 'draft',
  total_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  notes TEXT,
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage invoices"
  ON public.invoices FOR ALL
  TO authenticated
  USING (true);

-- Invoice items table
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view invoice items"
  ON public.invoice_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage invoice items"
  ON public.invoice_items FOR ALL
  TO authenticated
  USING (true);

-- ============================================
-- Payments Table
-- ============================================

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  payment_type payment_type DEFAULT 'cash',
  payment_date DATE DEFAULT CURRENT_DATE,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage payments"
  ON public.payments FOR ALL
  TO authenticated
  USING (true);

-- ============================================
-- Accounting Tables
-- ============================================

-- Accounts table
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_number TEXT UNIQUE NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  parent_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  balance NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view accounts"
  ON public.accounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage accounts"
  ON public.accounts FOR ALL
  TO authenticated
  USING (true);

-- Account entries table
CREATE TABLE public.account_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0,
  entry_date DATE DEFAULT CURRENT_DATE,
  description TEXT,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.account_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view account entries"
  ON public.account_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage account entries"
  ON public.account_entries FOR ALL
  TO authenticated
  USING (true);

-- Expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE,
  description TEXT,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  receipt_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view expenses"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage expenses"
  ON public.expenses FOR ALL
  TO authenticated
  USING (true);

-- ============================================
-- WhatsApp Integration Tables
-- ============================================

-- WhatsApp messages table
CREATE TABLE public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_number TEXT,
  to_number TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  message_content TEXT NOT NULL,
  media_url TEXT,
  status message_status DEFAULT 'pending',
  error_message TEXT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  is_reply BOOLEAN DEFAULT false,
  reply_to_id UUID REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,
  webhook_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view whatsapp messages"
  ON public.whatsapp_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage whatsapp messages"
  ON public.whatsapp_messages FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert whatsapp messages"
  ON public.whatsapp_messages FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Message templates table
CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  variables JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view message templates"
  ON public.message_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage message templates"
  ON public.message_templates FOR ALL
  TO authenticated
  USING (true);

-- Bulk campaigns table
CREATE TABLE public.bulk_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  message_template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  customer_group_id UUID REFERENCES public.customer_groups(id) ON DELETE SET NULL,
  status campaign_status DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.bulk_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view bulk campaigns"
  ON public.bulk_campaigns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage bulk campaigns"
  ON public.bulk_campaigns FOR ALL
  TO authenticated
  USING (true);

-- ============================================
-- Webhook Integration Tables
-- ============================================

-- Webhook settings table
CREATE TABLE public.webhook_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_type TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  webhook_token TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(webhook_type)
);

ALTER TABLE public.webhook_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view webhook settings"
  ON public.webhook_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage webhook settings"
  ON public.webhook_settings FOR ALL
  TO authenticated
  USING (true);

-- Webhook logs table
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_setting_id UUID REFERENCES public.webhook_settings(id) ON DELETE CASCADE,
  request_payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view webhook logs"
  ON public.webhook_logs FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- Settings Tables
-- ============================================

-- Website settings table
CREATE TABLE public.website_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view website settings"
  ON public.website_settings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage website settings"
  ON public.website_settings FOR ALL
  TO authenticated
  USING (true);

-- Barcode label settings table
CREATE TABLE public.barcode_label_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label_width NUMERIC DEFAULT 100,
  label_height NUMERIC DEFAULT 50,
  show_company_logo BOOLEAN DEFAULT true,
  show_company_name BOOLEAN DEFAULT true,
  show_order_number BOOLEAN DEFAULT true,
  show_customer_name BOOLEAN DEFAULT true,
  show_service_type BOOLEAN DEFAULT true,
  font_size NUMERIC DEFAULT 12,
  barcode_height NUMERIC DEFAULT 40,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.barcode_label_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view barcode settings"
  ON public.barcode_label_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage barcode settings"
  ON public.barcode_label_settings FOR ALL
  TO authenticated
  USING (true);

-- ============================================
-- Evaluations Table
-- ============================================

CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view evaluations"
  ON public.evaluations FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create evaluations"
  ON public.evaluations FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Activity Logs Table
-- ============================================

CREATE TABLE public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity logs"
  ON public.user_activity_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- Views for Reports
-- ============================================

-- Order payment summary view
CREATE OR REPLACE VIEW public.order_payment_summary AS
SELECT 
  o.id as order_id,
  o.order_number,
  o.customer_id,
  c.name as customer_name,
  o.total_amount,
  COALESCE(SUM(p.amount), 0) as paid_amount,
  o.total_amount - COALESCE(SUM(p.amount), 0) as balance,
  o.status,
  o.created_at
FROM public.orders o
LEFT JOIN public.customers c ON o.customer_id = c.id
LEFT JOIN public.payments p ON p.order_id = o.id
GROUP BY o.id, o.order_number, o.customer_id, c.name, o.total_amount, o.status, o.created_at;

-- Customer order balances view
CREATE OR REPLACE VIEW public.customer_order_balances AS
SELECT 
  c.id as customer_id,
  c.name as customer_name,
  COUNT(DISTINCT o.id) as total_orders,
  COALESCE(SUM(o.total_amount), 0) as total_amount,
  COALESCE(SUM(p.amount), 0) as paid_amount,
  COALESCE(SUM(o.total_amount), 0) - COALESCE(SUM(p.amount), 0) as balance
FROM public.customers c
LEFT JOIN public.orders o ON o.customer_id = c.id
LEFT JOIN public.payments p ON p.customer_id = c.id
GROUP BY c.id, c.name;

-- Customer outstanding balances view
CREATE OR REPLACE VIEW public.customer_outstanding_balances AS
SELECT 
  c.id as customer_id,
  c.name as customer_name,
  c.phone,
  c.whatsapp,
  COALESCE(SUM(o.total_amount - o.paid_amount), 0) as outstanding_balance
FROM public.customers c
LEFT JOIN public.orders o ON o.customer_id = c.id
WHERE o.status != 'cancelled'
GROUP BY c.id, c.name, c.phone, c.whatsapp
HAVING COALESCE(SUM(o.total_amount - o.paid_amount), 0) > 0;

-- ============================================
-- Create Storage Bucket
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for company-assets
CREATE POLICY "Public can view company assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-assets');

CREATE POLICY "Authenticated users can upload company assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'company-assets');

CREATE POLICY "Authenticated users can update company assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'company-assets');

CREATE POLICY "Authenticated users can delete company assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'company-assets');

-- ============================================
-- Triggers for Updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_types_updated_at BEFORE UPDATE ON public.service_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_website_settings_updated_at BEFORE UPDATE ON public.website_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_barcode_label_settings_updated_at BEFORE UPDATE ON public.barcode_label_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_webhook_settings_updated_at BEFORE UPDATE ON public.webhook_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_whatsapp ON public.customers(whatsapp);
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);
CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX idx_whatsapp_messages_customer_id ON public.whatsapp_messages(customer_id);
CREATE INDEX idx_whatsapp_messages_status ON public.whatsapp_messages(status);
CREATE INDEX idx_account_entries_account_id ON public.account_entries(account_id);