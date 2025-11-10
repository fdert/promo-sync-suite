-- Create whatsapp_sessions table for QR login
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting_for_scan',
  qr_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  disconnected_at TIMESTAMP WITH TIME ZONE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  messages_synced BOOLEAN DEFAULT false,
  session_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can view all sessions"
ON public.whatsapp_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role' = 'admin')
  )
);

CREATE POLICY "Admins can insert sessions"
ON public.whatsapp_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role' = 'admin')
  )
);

CREATE POLICY "Admins can update sessions"
ON public.whatsapp_sessions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role' = 'admin')
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_whatsapp_sessions_updated_at
BEFORE UPDATE ON public.whatsapp_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for phone number lookups
CREATE INDEX idx_whatsapp_sessions_phone ON public.whatsapp_sessions(phone_number);
CREATE INDEX idx_whatsapp_sessions_active ON public.whatsapp_sessions(is_active, phone_number);