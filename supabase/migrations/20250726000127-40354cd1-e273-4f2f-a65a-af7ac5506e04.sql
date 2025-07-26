-- إنشاء جدول إعدادات الويب هوك
CREATE TABLE public.webhook_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_name TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  webhook_type TEXT NOT NULL DEFAULT 'incoming', -- incoming, outgoing
  is_active BOOLEAN DEFAULT true,
  secret_key TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول رسائل الواتس آب
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT,
  from_number TEXT NOT NULL,
  to_number TEXT,
  message_type TEXT DEFAULT 'text', -- text, image, audio, video, document
  message_content TEXT,
  media_url TEXT,
  status TEXT DEFAULT 'received', -- received, sent, delivered, read, failed
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  customer_id UUID,
  is_reply BOOLEAN DEFAULT false,
  replied_by UUID,
  replied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول قوالب الرسائل
CREATE TABLE public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  template_content TEXT NOT NULL,
  template_type TEXT DEFAULT 'quick_reply', -- quick_reply, welcome, follow_up
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.webhook_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لإعدادات الويب هوك
CREATE POLICY "المدراء يمكنهم إدارة إعدادات الويب هوك" 
ON public.webhook_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- سياسات الأمان لرسائل الواتس آب
CREATE POLICY "المدراء والموظفون يمكنهم رؤية جميع الرسائل" 
ON public.whatsapp_messages 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "المدراء والموظفون يمكنهم إضافة رسائل" 
ON public.whatsapp_messages 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "المدراء والموظفون يمكنهم تحديث الرسائل" 
ON public.whatsapp_messages 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "النظام يمكنه إضافة رسائل واردة" 
ON public.whatsapp_messages 
FOR INSERT 
WITH CHECK (true);

-- سياسات الأمان لقوالب الرسائل
CREATE POLICY "المدراء والموظفون يمكنهم إدارة القوالب" 
ON public.message_templates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

-- إنشاء تريجر لتحديث updated_at
CREATE TRIGGER update_webhook_settings_updated_at
  BEFORE UPDATE ON public.webhook_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_messages_updated_at
  BEFORE UPDATE ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- إنشاء فهارس للأداء
CREATE INDEX idx_whatsapp_messages_from_number ON public.whatsapp_messages(from_number);
CREATE INDEX idx_whatsapp_messages_timestamp ON public.whatsapp_messages(timestamp DESC);
CREATE INDEX idx_whatsapp_messages_status ON public.whatsapp_messages(status);
CREATE INDEX idx_webhook_settings_type ON public.webhook_settings(webhook_type);