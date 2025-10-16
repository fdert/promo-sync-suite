-- إضافة سياسة للمسؤولين لرؤية جميع سجلات النشاط
CREATE POLICY "Admins can view all activity logs"
ON public.user_activity_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- إضافة سياسة للسماح بإدراج سجلات النشاط
CREATE POLICY "Authenticated users can insert activity logs"
ON public.user_activity_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);